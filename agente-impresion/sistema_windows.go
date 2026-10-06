//go:build windows

package main

import (
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

var (
	winspool              = syscall.NewLazyDLL("winspool.drv")
	procOpenPrinter       = winspool.NewProc("OpenPrinterW")
	procClosePrinter      = winspool.NewProc("ClosePrinter")
	procStartDocPrinter   = winspool.NewProc("StartDocPrinterW")
	procEndDocPrinter     = winspool.NewProc("EndDocPrinter")
	procStartPagePrinter  = winspool.NewProc("StartPagePrinter")
	procEndPagePrinter    = winspool.NewProc("EndPagePrinter")
	procWritePrinter      = winspool.NewProc("WritePrinter")
	procEnumPrinters      = winspool.NewProc("EnumPrintersW")
	procGetDefaultPrinter = winspool.NewProc("GetDefaultPrinterW")
)

type docInfo1 struct {
	DocName    *uint16
	OutputFile *uint16
	Datatype   *uint16
}

type printerInfo4 struct {
	PrinterName *uint16
	ServerName  *uint16
	Attributes  uint32
}

func utf16Ptr(s string) *uint16 {
	p, _ := syscall.UTF16PtrFromString(s)
	return p
}

// imprimirRaw manda los bytes ESC/POS tal cual (RAW) a la impresora de Windows.
func imprimirRaw(impresora, documento string, datos []byte) error {
	var h syscall.Handle
	if r, _, err := procOpenPrinter.Call(uintptr(unsafe.Pointer(utf16Ptr(impresora))), uintptr(unsafe.Pointer(&h)), 0); r == 0 {
		return fmt.Errorf("no se pudo abrir la impresora %q: %v", impresora, err)
	}
	defer procClosePrinter.Call(uintptr(h))
	doc := docInfo1{DocName: utf16Ptr(documento), Datatype: utf16Ptr("RAW")}
	if r, _, err := procStartDocPrinter.Call(uintptr(h), 1, uintptr(unsafe.Pointer(&doc))); r == 0 {
		return fmt.Errorf("la impresora no aceptó el documento: %v", err)
	}
	defer procEndDocPrinter.Call(uintptr(h))
	procStartPagePrinter.Call(uintptr(h))
	defer procEndPagePrinter.Call(uintptr(h))
	var escritos uint32
	if len(datos) == 0 {
		return nil
	}
	if r, _, err := procWritePrinter.Call(uintptr(h), uintptr(unsafe.Pointer(&datos[0])), uintptr(len(datos)), uintptr(unsafe.Pointer(&escritos))); r == 0 {
		return fmt.Errorf("error al enviar a la impresora: %v", err)
	}
	if int(escritos) != len(datos) {
		return errors.New("la impresora no recibió todo el documento")
	}
	return nil
}

func listarImpresoras() ([]string, error) {
	const flags = 2 | 4 // PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS
	var necesarios, cantidad uint32
	procEnumPrinters.Call(flags, 0, 4, 0, 0, uintptr(unsafe.Pointer(&necesarios)), uintptr(unsafe.Pointer(&cantidad)))
	if necesarios == 0 {
		return []string{}, nil
	}
	buf := make([]byte, necesarios)
	if r, _, err := procEnumPrinters.Call(flags, 0, 4, uintptr(unsafe.Pointer(&buf[0])), uintptr(necesarios),
		uintptr(unsafe.Pointer(&necesarios)), uintptr(unsafe.Pointer(&cantidad))); r == 0 {
		return nil, fmt.Errorf("no se pudieron listar las impresoras: %v", err)
	}
	infos := unsafe.Slice((*printerInfo4)(unsafe.Pointer(&buf[0])), cantidad)
	out := make([]string, 0, cantidad)
	for _, inf := range infos {
		out = append(out, syscall.UTF16ToString(unsafe.Slice(inf.PrinterName, wcslen(inf.PrinterName))))
	}
	return out, nil
}

func wcslen(p *uint16) int {
	n := 0
	for ptr := unsafe.Pointer(p); *(*uint16)(ptr) != 0; n++ {
		ptr = unsafe.Add(ptr, 2)
	}
	return n
}

func impresoraPredeterminada() (string, error) {
	var n uint32 = 512
	buf := make([]uint16, n)
	if r, _, err := procGetDefaultPrinter.Call(uintptr(unsafe.Pointer(&buf[0])), uintptr(unsafe.Pointer(&n))); r == 0 {
		return "", err
	}
	return syscall.UTF16ToString(buf), nil
}

func oculto(nombre string, args ...string) *exec.Cmd {
	c := exec.Command(nombre, args...)
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	return c
}

func abrirNavegador(url string) {
	_ = oculto("rundll32", "url.dll,FileProtocolHandler", url).Start()
}

const claveRun = `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`

func rutaInstalada() string { return filepath.Join(dirDatos(), "VULO-Impresion.exe") }

func autoinicioActivo() bool {
	return oculto("reg", "query", claveRun, "/v", nombreApp).Run() == nil
}

func configurarAutoinicio(on bool) error {
	if !on {
		_ = oculto("reg", "delete", claveRun, "/v", nombreApp, "/f").Run()
		return nil
	}
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	valor := fmt.Sprintf(`"%s" --segundo-plano`, exe)
	if err := oculto("reg", "add", claveRun, "/v", nombreApp, "/t", "REG_SZ", "/d", valor, "/f").Run(); err != nil {
		return fmt.Errorf("no se pudo activar el inicio automático: %v", err)
	}
	return nil
}

func accesos() []string {
	var out []string
	if ad := os.Getenv("APPDATA"); ad != "" {
		out = append(out, filepath.Join(ad, `Microsoft\Windows\Start Menu\Programs`, "VULO Impresión.lnk"))
	}
	if up := os.Getenv("USERPROFILE"); up != "" {
		out = append(out, filepath.Join(up, "Desktop", "VULO Impresión.lnk"))
	}
	return out
}

func crearAccesos(destino string) {
	for _, lnk := range accesos() {
		ps := fmt.Sprintf(`$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%s');$s.TargetPath='%s';$s.WorkingDirectory='%s';$s.Description='Agente de impresión VULO';$s.Save()`,
			strings.ReplaceAll(lnk, "'", "''"), strings.ReplaceAll(destino, "'", "''"), strings.ReplaceAll(filepath.Dir(destino), "'", "''"))
		_ = oculto("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps).Run()
	}
}

func copiarArchivo(origen, destino string) error {
	in, err := os.Open(origen)
	if err != nil {
		return err
	}
	defer in.Close()
	tmp := destino + ".nuevo"
	out, err := os.Create(tmp)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		return err
	}
	out.Close()
	_ = os.Remove(destino)
	return os.Rename(tmp, destino)
}

// instalarSiHaceFalta: si se abrió desde otra carpeta (Descargas), se copia a
// %LOCALAPPDATA%\VULO Impresion, activa el inicio automático, crea accesos y
// arranca la copia instalada. Si ya había una versión corriendo la reemplaza.
func instalarSiHaceFalta() bool {
	exe, err := os.Executable()
	if err != nil {
		return false
	}
	destino := rutaInstalada()
	if strings.EqualFold(filepath.Clean(exe), filepath.Clean(destino)) {
		return false
	}
	if c, err := net.DialTimeout("tcp", "127.0.0.1:"+puerto, time.Second); err == nil {
		c.Close()
		req, _ := http.NewRequest(http.MethodPost, "http://127.0.0.1:"+puerto+"/api/salir", nil)
		req.Header.Set("X-Vulo", "1")
		if res, err := http.DefaultClient.Do(req); err == nil {
			res.Body.Close()
		}
		time.Sleep(1500 * time.Millisecond)
	}
	var cerr error
	for i := 0; i < 5; i++ {
		if cerr = copiarArchivo(exe, destino); cerr == nil {
			break
		}
		time.Sleep(time.Second)
	}
	if cerr != nil {
		return false
	}
	valor := fmt.Sprintf(`"%s" --segundo-plano`, destino)
	_ = oculto("reg", "add", claveRun, "/v", nombreApp, "/t", "REG_SZ", "/d", valor, "/f").Run()
	crearAccesos(destino)
	if err := exec.Command(destino).Start(); err != nil {
		return false
	}
	return true
}

func desinstalar() {
	_ = oculto("reg", "delete", claveRun, "/v", nombreApp, "/f").Run()
	for _, lnk := range accesos() {
		_ = os.Remove(lnk)
	}
	dir := dirDatos()
	_ = oculto("cmd", "/c", fmt.Sprintf(`timeout /t 3 /nobreak >nul & rmdir /s /q "%s"`, dir)).Start()
}
