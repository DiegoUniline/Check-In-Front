package main

import (
	"bytes"
	"strings"
	"testing"
)

func visible(b []byte) string {
	// Quita comandos ESC/GS para ver el texto.
	var out bytes.Buffer
	for i := 0; i < len(b); i++ {
		switch b[i] {
		case 0x1B:
			if i+1 < len(b) && b[i+1] == 0x40 {
				i++
			} else {
				i += 2
			}
		case 0x1D:
			if i+1 < len(b) && b[i+1] == 0x56 {
				i += 3
				out.WriteString("--8<-- corte\n")
			} else {
				i += 2
			}
		default:
			out.WriteByte(b[i])
		}
	}
	return out.String()
}

func TestRender(t *testing.T) {
	lineas := []Linea{
		{K: "t", S: "Hotel Camino Real", A: "c", B: true, G: true},
		{K: "t", S: "CIERRE DE TURNO", A: "c"},
		{K: "hr"},
		{K: "r", L: "Responsable", R: "María Pérez"},
		{K: "r", L: "Efectivo esperado", R: "$12,345.00", B: true},
		{K: "r", L: "Juan Carlos Hernández Domínguez · Reserva R-2026-0001 pago con tarjeta", R: "$1,000.00"},
		{K: "firma", S: "Entrega"},
	}
	out := RenderTicket(lineas, 32, 2)
	txt := visible(out)
	t.Log("\n" + txt)
	for _, l := range strings.Split(txt, "\n") {
		if n := len([]rune(l)); n > 32 {
			t.Fatalf("renglón de %d > 32: %q", n, l)
		}
	}
	if strings.Count(txt, "corte") != 2 {
		t.Fatal("deben ser 2 copias con corte")
	}
	if !bytes.Contains(out, []byte{'M', 'a', 'r', 0xA1, 'a'}) {
		t.Fatal("acentos en CP850")
	}
}
