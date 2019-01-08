
exports.stringify = exports.encode = encode

var eol = "\r\n";
var lf = "\n";
var cr = '\r'

function encode(pedido) {
  var out = '';

  out += '[Cabecera]' + eol + lf;
  var cab = pedido.Cabecera

  out += 'DELIVERY=' + cab.DELIVERY + eol + lf + cr;
  out += 'FECHAHORA=' + cab.FECHAHORA + lf + eol;
  out += 'IDPEDIDO=' + cab.IDPEDIDO + eol + lf;
  out += 'DESCUENTO=' + cab.DESCUENTO + eol;
  out += 'PAGADO=' + cab.PAGADO + eol;

  out += '[Cliente]' + lf + eol;
  var cli = pedido.Cliente;

  out += 'CLIENTE=' + cli.CLIENTE + eol;
  out += 'CIFDNI=' + cli.CIFDNI + eol;
  out += 'Nombre=' + cli.Nombre + eol + lf;
  out += 'Dirección=' + cli.Direccion + eol;
  out += 'Numero=' + cli.Numero + eol;
  out += 'Población=' + cli.Poblacion + eol;
  out += 'CP=' + cli.CP + eol;
  out += 'ZONA=' + cli.ZONA + eol;
  out += 'Telefonos=' + cli.Telefonos + eol;
  out += 'Email=' + cli.Email + lf + eol;
  out += 'Observaciones=' + cli.Observaciones + eol;

  out += '[Lineas]' + eol + lf;
  var lin = pedido.Lineas;

  Object.keys(lin).forEach( function(key) {
    out += key + '=';
    val = lin[key];
    var finString = val;
    var indexOf = finString.indexOf('OK1212');
    var accumulador = '';
    while (indexOf >= 0) {
      // tipo LF CR EOL
      var salto = eol;
      if (finString.charAt(indexOf + 6) === 'L') {
        salto = lf;
      }
      if (finString.charAt(indexOf + 6) === 'A') {
        salto = cr;
      }


      accumulador += safe(finString.slice(0, indexOf)) + salto;
      finString = finString.slice(indexOf + 11);
      indexOf = finString.indexOf('OK1212');
    }
    out += accumulador;
  });

  return out;
}


function isQuoted (val) {
  return (val.charAt(0) === "\"" && val.slice(-1) === "\"")
         || (val.charAt(0) === "'" && val.slice(-1) === "'")
}

function safe(val) {
  return ( typeof val !== "string"
         || val.match(/[=\r\n]/)
         || val.match(/^\[/)
         || (val.length > 1
             && isQuoted(val))
         || val !== val.trim() )
         ? JSON.stringify(val)
         : val.replace(/#/g, "\\#")
}
