package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const (
	version   = "1.0.0"
	puerto    = "17777"
	nombreApp = "VULO Impresion"
	intervalo = 3 * time.Second
)

//go:embed ui.html
var uiFS embed.FS

type Config struct {
	Token     string `json:"token"`
	AgenteID  string `json:"agente_id"`
	Nombre    string `json:"nombre"`
	Hotel     string `json:"hotel"`
	Impresora string `json:"impresora"`
	Ancho     int    `json:"ancho"`
}

type Evento struct {
	Hora  string `json:"hora"`
	Texto string `json:"texto"`
	Error bool   `json:"error"`
}

type Estado struct {
	mu        sync.Mutex
	cfg       Config
	conectado bool
	ultimo    time.Time
	errorMsg  string
	eventos   []Evento
	impresos  int
}

var st = &Estado{}

func dirDatos() string {
	base := os.Getenv("LOCALAPPDATA")
	if base == "" {
		base, _ = os.UserConfigDir()
	}
	d := filepath.Join(base, nombreApp)
	_ = os.MkdirAll(d, 0o755)
	return d
}

func rutaConfig() string { return filepath.Join(dirDatos(), "config.json") }

func cargarConfig() {
	data, err := os.ReadFile(rutaConfig())
	if err == nil {
		_ = json.Unmarshal(data, &st.cfg)
	}
	if st.cfg.Ancho == 0 {
		st.cfg.Ancho = 48
	}
}

func guardarConfig() {
	data, _ := json.MarshalIndent(st.cfg, "", "  ")
	_ = os.WriteFile(rutaConfig(), data, 0o600)
}

func registrar(texto string, esError bool) {
	st.mu.Lock()
	defer st.mu.Unlock()
	st.eventos = append([]Evento{{Hora: time.Now().Format("02/01 15:04:05"), Texto: texto, Error: esError}}, st.eventos...)
	if len(st.eventos) > 60 {
		st.eventos = st.eventos[:60]
	}
	f, err := os.OpenFile(filepath.Join(dirDatos(), "agente.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err == nil {
		if info, _ := f.Stat(); info != nil && info.Size() > 1<<20 {
			_ = f.Truncate(0)
		}
		fmt.Fprintf(f, "%s %s\n", time.Now().Format(time.RFC3339), texto)
		f.Close()
	}
}

func imprimirTrabajo(t Trabajo) error {
	st.mu.Lock()
	impresora, ancho := st.cfg.Impresora, st.cfg.Ancho
	st.mu.Unlock()
	if impresora == "" {
		return fmt.Errorf("no hay impresora seleccionada")
	}
	datos := RenderTicket(t.Contenido, ancho, t.Copias)
	return imprimirRaw(impresora, "VULO - "+t.Titulo, datos)
}

func ciclo() {
	espera := intervalo
	for {
		time.Sleep(espera)
		st.mu.Lock()
		cfg := st.cfg
		st.mu.Unlock()
		if cfg.Token == "" {
			espera = intervalo
			continue
		}
		impresoras, _ := listarImpresoras()
		var r RespuestaTomar
		err := rpc("vulo_print_tomar", map[string]any{
			"p_token": cfg.Token, "p_impresora": cfg.Impresora, "p_impresoras": impresoras,
			"p_ancho": cfg.Ancho, "p_version": version,
		}, &r)
		st.mu.Lock()
		if err != nil {
			st.conectado = false
			st.errorMsg = err.Error()
			if err == errNoVinculado {
				st.cfg.Token, st.cfg.AgenteID = "", ""
				guardarConfig()
			}
		} else {
			st.conectado, st.ultimo, st.errorMsg = true, time.Now(), ""
		}
		st.mu.Unlock()
		if err != nil {
			if err == errNoVinculado {
				registrar("El sistema desvinculó esta computadora. Vuelve a vincularla.", true)
			}
			espera = 10 * time.Second
			continue
		}
		espera = intervalo
		for _, t := range r.Trabajos {
			perr := imprimirTrabajo(t)
			msg := ""
			if perr != nil {
				msg = perr.Error()
				registrar("No se imprimió "+t.Titulo+": "+msg, true)
			} else {
				st.mu.Lock()
				st.impresos++
				st.mu.Unlock()
				registrar("Impreso: "+t.Titulo, false)
			}
			if err := rpc("vulo_print_reportar", map[string]any{
				"p_token": cfg.Token, "p_trabajo_id": t.ID, "p_ok": perr == nil, "p_error": msg,
			}, nil); err != nil {
				registrar("No se pudo avisar al sistema: "+err.Error(), true)
			}
		}
	}
}

func ticketPrueba() []Linea {
	st.mu.Lock()
	cfg := st.cfg
	st.mu.Unlock()
	return []Linea{
		{K: "t", S: "VULO", A: "c", B: true, G: true},
		{K: "t", S: "Prueba de impresión", A: "c"},
		{K: "hr"},
		{K: "r", L: "Hotel", R: cfg.Hotel},
		{K: "r", L: "Equipo", R: cfg.Nombre},
		{K: "r", L: "Impresora", R: cfg.Impresora},
		{K: "r", L: "Fecha", R: time.Now().Format("02/01/2006 15:04")},
		{K: "hr"},
		{K: "t", S: "Acentos: áéíóú ñ ÁÉÍÓÚ Ñ ¿¡"},
		{K: "r", L: "Total", R: "$1,234.50", B: true},
		{K: "t", S: "Si lees esto, la impresora está lista.", A: "c"},
	}
}

// Sólo el propio panel: bloquea peticiones de otros sitios (CSRF / DNS rebinding).
func seguro(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		host := r.Host
		if host != "127.0.0.1:"+puerto && host != "localhost:"+puerto {
			http.Error(w, "no permitido", http.StatusForbidden)
			return
		}
		if r.Method != http.MethodGet && r.Header.Get("X-Vulo") != "1" {
			http.Error(w, "no permitido", http.StatusForbidden)
			return
		}
		if o := r.Header.Get("Origin"); o != "" && o != "http://127.0.0.1:"+puerto && o != "http://localhost:"+puerto {
			http.Error(w, "no permitido", http.StatusForbidden)
			return
		}
		h(w, r)
	}
}

func responder(w http.ResponseWriter, v any, err error) {
	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	_ = json.NewEncoder(w).Encode(v)
}

func leer(r *http.Request, v any) error {
	return json.NewDecoder(http.MaxBytesReader(nil, r.Body, 1<<16)).Decode(v)
}

func servidor(ln net.Listener) {
	mux := http.NewServeMux()
	mux.HandleFunc("/", seguro(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		data, _ := uiFS.ReadFile("ui.html")
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("X-Frame-Options", "DENY")
		_, _ = w.Write(data)
	}))
	mux.HandleFunc("/api/estado", seguro(func(w http.ResponseWriter, r *http.Request) {
		impresoras, perr := listarImpresoras()
		st.mu.Lock()
		defer st.mu.Unlock()
		ultimo := ""
		if !st.ultimo.IsZero() {
			ultimo = st.ultimo.Format("15:04:05")
		}
		errImp := ""
		if perr != nil {
			errImp = perr.Error()
		}
		responder(w, map[string]any{
			"version": version, "vinculado": st.cfg.Token != "", "nombre": st.cfg.Nombre, "hotel": st.cfg.Hotel,
			"impresora": st.cfg.Impresora, "ancho": st.cfg.Ancho, "impresoras": impresoras, "errorImpresoras": errImp,
			"conectado": st.conectado, "ultimo": ultimo, "error": st.errorMsg, "eventos": st.eventos,
			"impresos": st.impresos, "autoinicio": autoinicioActivo(),
		}, nil)
	}))
	mux.HandleFunc("/api/vincular", seguro(func(w http.ResponseWriter, r *http.Request) {
		var in struct{ Codigo string }
		if err := leer(r, &in); err != nil || strings.TrimSpace(in.Codigo) == "" {
			responder(w, nil, fmt.Errorf("escribe el código"))
			return
		}
		var out RespuestaVincular
		if err := rpc("vulo_print_vincular", map[string]any{"p_codigo": in.Codigo, "p_version": version}, &out); err != nil {
			responder(w, nil, err)
			return
		}
		st.mu.Lock()
		st.cfg.Token, st.cfg.AgenteID, st.cfg.Nombre, st.cfg.Hotel = out.Token, out.AgenteID, out.Nombre, out.Hotel
		if st.cfg.Impresora == "" {
			if def, err := impresoraPredeterminada(); err == nil {
				st.cfg.Impresora = def
			}
		}
		guardarConfig()
		st.mu.Unlock()
		registrar("Vinculado a "+out.Hotel+" como "+out.Nombre, false)
		responder(w, map[string]bool{"ok": true}, nil)
	}))
	mux.HandleFunc("/api/config", seguro(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Impresora string
			Ancho     int
		}
		if err := leer(r, &in); err != nil {
			responder(w, nil, err)
			return
		}
		st.mu.Lock()
		st.cfg.Impresora = in.Impresora
		if in.Ancho == 32 || in.Ancho == 42 || in.Ancho == 48 {
			st.cfg.Ancho = in.Ancho
		}
		guardarConfig()
		st.mu.Unlock()
		responder(w, map[string]bool{"ok": true}, nil)
	}))
	mux.HandleFunc("/api/prueba", seguro(func(w http.ResponseWriter, r *http.Request) {
		err := imprimirTrabajo(Trabajo{Titulo: "Prueba", Contenido: ticketPrueba(), Copias: 1})
		if err == nil {
			registrar("Impresión de prueba enviada", false)
		} else {
			registrar("Prueba falló: "+err.Error(), true)
		}
		responder(w, map[string]bool{"ok": err == nil}, err)
	}))
	mux.HandleFunc("/api/autoinicio", seguro(func(w http.ResponseWriter, r *http.Request) {
		var in struct{ On bool }
		_ = leer(r, &in)
		responder(w, map[string]bool{"ok": true}, configurarAutoinicio(in.On))
	}))
	mux.HandleFunc("/api/desvincular", seguro(func(w http.ResponseWriter, r *http.Request) {
		st.mu.Lock()
		st.cfg.Token, st.cfg.AgenteID = "", ""
		guardarConfig()
		st.mu.Unlock()
		registrar("Computadora desvinculada", false)
		responder(w, map[string]bool{"ok": true}, nil)
	}))
	mux.HandleFunc("/api/desinstalar", seguro(func(w http.ResponseWriter, r *http.Request) {
		responder(w, map[string]bool{"ok": true}, nil)
		go func() {
			time.Sleep(500 * time.Millisecond)
			desinstalar()
			os.Exit(0)
		}()
	}))
	mux.HandleFunc("/api/salir", seguro(func(w http.ResponseWriter, r *http.Request) {
		responder(w, map[string]bool{"ok": true}, nil)
		go func() { time.Sleep(300 * time.Millisecond); os.Exit(0) }()
	}))
	srv := &http.Server{Handler: mux, ReadHeaderTimeout: 10 * time.Second}
	_ = srv.Serve(ln)
}

func main() {
	panel := "http://127.0.0.1:" + puerto + "/"
	// Primera ejecución desde Descargas: se copia a su carpeta y arranca desde ahí.
	if instalarSiHaceFalta() {
		return
	}
	ln, err := net.Listen("tcp", "127.0.0.1:"+puerto)
	if err != nil {
		// Ya está corriendo: sólo abre el panel.
		abrirNavegador(panel)
		return
	}
	cargarConfig()
	registrar("Agente iniciado (versión "+version+")", false)
	go ciclo()
	if st.cfg.Token == "" || len(os.Args) < 2 || os.Args[1] != "--segundo-plano" {
		go func() { time.Sleep(700 * time.Millisecond); abrirNavegador(panel) }()
	}
	servidor(ln)
}
