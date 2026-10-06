package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Se inyectan al compilar (-ldflags -X); son la URL y la llave pública del sistema.
var (
	supabaseURL = ""
	supabaseKey = ""
)

var httpClient = &http.Client{Timeout: 20 * time.Second}

var errNoVinculado = errors.New("AGENTE_NO_VINCULADO")

func rpc(fn string, args any, out any) error {
	body, _ := json.Marshal(args)
	req, err := http.NewRequest(http.MethodPost, supabaseURL+"/rest/v1/rpc/"+fn, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Authorization", "Bearer "+supabaseKey)
	req.Header.Set("Content-Type", "application/json")
	res, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("sin conexión con el sistema: %w", err)
	}
	defer res.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(res.Body, 4<<20))
	if res.StatusCode >= 300 {
		var e struct {
			Message string `json:"message"`
		}
		_ = json.Unmarshal(data, &e)
		if e.Message == "AGENTE_NO_VINCULADO" {
			return errNoVinculado
		}
		if e.Message == "" {
			e.Message = fmt.Sprintf("error %d del sistema", res.StatusCode)
		}
		return errors.New(e.Message)
	}
	if out != nil && len(data) > 0 {
		return json.Unmarshal(data, out)
	}
	return nil
}

type Trabajo struct {
	ID        string  `json:"id"`
	Tipo      string  `json:"tipo"`
	Titulo    string  `json:"titulo"`
	Contenido []Linea `json:"contenido"`
	Copias    int     `json:"copias"`
}

type RespuestaTomar struct {
	Nombre   string    `json:"nombre"`
	Activo   bool      `json:"activo"`
	Trabajos []Trabajo `json:"trabajos"`
}

type RespuestaVincular struct {
	Token    string `json:"token"`
	AgenteID string `json:"agente_id"`
	Nombre   string `json:"nombre"`
	Hotel    string `json:"hotel"`
}
