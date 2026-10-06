//go:build !windows

package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// Fuera de Windows (pruebas): la "impresora" es un archivo con los bytes ESC/POS.
func imprimirRaw(impresora, documento string, datos []byte) error {
	nombre := strings.NewReplacer(" ", "_", "/", "_").Replace(documento)
	return os.WriteFile(filepath.Join(os.TempDir(), "vulo-"+nombre+".bin"), datos, 0o644)
}

func listarImpresoras() ([]string, error)      { return []string{"Archivo de prueba"}, nil }
func impresoraPredeterminada() (string, error) { return "Archivo de prueba", nil }
func abrirNavegador(url string)                { _ = exec.Command("xdg-open", url).Start() }
func autoinicioActivo() bool                   { return false }
func configurarAutoinicio(on bool) error       { return nil }
func instalarSiHaceFalta() bool                { return false }
func desinstalar()                             {}
