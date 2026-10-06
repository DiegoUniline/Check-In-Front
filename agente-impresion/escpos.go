package main

import (
	"bytes"
	"strings"
	"unicode/utf8"
)

// Linea es el formato que manda el sistema (print_trabajos.contenido).
//
//	k: "t" texto, "r" fila izquierda/derecha, "hr" separador, "sp" espacio, "firma"
type Linea struct {
	K string `json:"k"`
	S string `json:"s,omitempty"`
	L string `json:"l,omitempty"`
	R string `json:"r,omitempty"`
	A string `json:"a,omitempty"` // "c" centro, "r" derecha
	B bool   `json:"b,omitempty"` // negritas
	G bool   `json:"g,omitempty"` // grande (doble alto y ancho)
	N int    `json:"n,omitempty"`
}

var (
	escInit       = []byte{0x1B, 0x40}
	escCP850      = []byte{0x1B, 0x74, 0x02}
	escBoldOn     = []byte{0x1B, 0x45, 0x01}
	escBoldOff    = []byte{0x1B, 0x45, 0x00}
	escAlignL     = []byte{0x1B, 0x61, 0x00}
	escAlignC     = []byte{0x1B, 0x61, 0x01}
	escAlignR     = []byte{0x1B, 0x61, 0x02}
	escSizeBig    = []byte{0x1D, 0x21, 0x11}
	escSizeNorm   = []byte{0x1D, 0x21, 0x00}
	escFeedAndCut = []byte{0x1B, 0x64, 0x04, 0x1D, 0x56, 0x42, 0x00}
)

var cp850 = map[rune]byte{
	'á': 0xA0, 'é': 0x82, 'í': 0xA1, 'ó': 0xA2, 'ú': 0xA3, 'ñ': 0xA4, 'Ñ': 0xA5,
	'Á': 0xB5, 'É': 0x90, 'Í': 0xD6, 'Ó': 0xE0, 'Ú': 0xE9, 'ü': 0x81, 'Ü': 0x9A,
	'¿': 0xA8, '¡': 0xAD, '°': 0xF8, '·': 0xFA, '×': 0x9E, 'ç': 0x87, 'Ç': 0x80,
}

var reemplazos = map[rune]string{
	'→': ">", '←': "<", '—': "-", '–': "-", '“': "\"", '”': "\"", '‘': "'", '’': "'",
	'…': "...", '€': "EUR", ' ': " ", '\t': " ",
}

func encodeCP850(s string) []byte {
	var b bytes.Buffer
	for _, r := range s {
		switch {
		case r < 0x80:
			b.WriteRune(r)
		case cp850[r] != 0:
			b.WriteByte(cp850[r])
		case reemplazos[r] != "":
			b.WriteString(reemplazos[r])
		default:
			b.WriteByte('?')
		}
	}
	return b.Bytes()
}

func limpiar(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r == '\r' {
			continue
		}
		if v, ok := reemplazos[r]; ok {
			b.WriteString(v)
		} else {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func largo(s string) int { return utf8.RuneCountInString(s) }

// envolver parte el texto en renglones de máximo `ancho` caracteres.
func envolver(s string, ancho int) []string {
	if ancho < 1 {
		ancho = 1
	}
	var out []string
	for _, parrafo := range strings.Split(limpiar(s), "\n") {
		palabras := strings.Fields(parrafo)
		if len(palabras) == 0 {
			out = append(out, "")
			continue
		}
		actual := ""
		for _, p := range palabras {
			for largo(p) > ancho {
				if actual != "" {
					out = append(out, actual)
					actual = ""
				}
				rs := []rune(p)
				out = append(out, string(rs[:ancho]))
				p = string(rs[ancho:])
			}
			switch {
			case actual == "":
				actual = p
			case largo(actual)+1+largo(p) <= ancho:
				actual += " " + p
			default:
				out = append(out, actual)
				actual = p
			}
		}
		out = append(out, actual)
	}
	return out
}

// RenderTicket convierte las líneas a bytes ESC/POS. cols: 48 (80 mm) o 32 (58 mm).
func RenderTicket(lineas []Linea, cols int, copias int) []byte {
	if cols != 32 && cols != 42 && cols != 48 {
		cols = 48
	}
	if copias < 1 {
		copias = 1
	}
	var cuerpo bytes.Buffer
	w := func(p []byte) { cuerpo.Write(p) }
	txt := func(s string) { cuerpo.Write(encodeCP850(s)); cuerpo.WriteByte('\n') }

	for _, l := range lineas {
		switch l.K {
		case "t":
			ancho := cols
			if l.G {
				ancho = cols / 2
				w(escSizeBig)
			}
			switch l.A {
			case "c":
				w(escAlignC)
			case "r":
				w(escAlignR)
			default:
				w(escAlignL)
			}
			if l.B {
				w(escBoldOn)
			}
			for _, renglon := range envolver(l.S, ancho) {
				txt(renglon)
			}
			w(escBoldOff)
			w(escSizeNorm)
			w(escAlignL)
		case "r":
			if l.B {
				w(escBoldOn)
			}
			der := limpiar(l.R)
			espacio := cols - largo(der) - 1
			if espacio < cols/3 {
				// Derecha muy larga: va en su propio renglón.
				for _, renglon := range envolver(l.L, cols) {
					txt(renglon)
				}
				txt(strings.Repeat(" ", max(0, cols-largo(der))) + der)
			} else {
				izq := envolver(l.L, espacio)
				for i, renglon := range izq {
					if i == 0 {
						txt(renglon + strings.Repeat(" ", cols-largo(renglon)-largo(der)) + der)
					} else {
						txt(renglon)
					}
				}
			}
			w(escBoldOff)
		case "hr":
			txt(strings.Repeat("-", cols))
		case "sp":
			n := l.N
			if n < 1 {
				n = 1
			}
			for i := 0; i < n && i < 10; i++ {
				txt("")
			}
		case "firma":
			txt("")
			txt("")
			txt("")
			w(escAlignC)
			txt(strings.Repeat("_", cols-10))
			txt(limpiar(l.S))
			w(escAlignL)
		}
	}

	var out bytes.Buffer
	for i := 0; i < copias; i++ {
		out.Write(escInit)
		out.Write(escCP850)
		out.Write(cuerpo.Bytes())
		out.Write(escFeedAndCut)
	}
	return out.Bytes()
}
