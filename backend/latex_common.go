package main

import (
	"fmt"
	"io/ioutil"
	"path/filepath"
	"strings"
)

var latexEscaper = strings.NewReplacer(
	`\\`, `\textbackslash{}`,
	"&", `\&`,
	"%", `\%`,
	"$", `\$`,
	"#", `\#`,
	"_", `\_`,
	"{", `\{`,
	"}", `\}`,
	"~", `\textasciitilde{}`,
	"^", `\textasciicircum{}`,
)

func esc(s string) string {
	return latexEscaper.Replace(s)
}

// readTemplate reads a LaTeX template file from the Resume-Stubs directory.
func readTemplate(filename string) (string, error) {
	path := filepath.Join("Resume-Stubs", filename)
	content, err := ioutil.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("failed to read template %s: %w", filename, err)
	}
	return string(content), nil
}

