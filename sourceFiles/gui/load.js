const load = () => {
document.getElementById('theme').href =(`${(opts['dark']?'dark':'light')}.css`)
}
load()