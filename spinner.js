import ora from "ora";

export function criarSpinner(texto) {
  return ora({
    text: texto,
    spinner: "dots12",
    color: "cyan"
  });
}
