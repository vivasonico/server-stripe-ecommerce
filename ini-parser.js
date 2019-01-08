
exports.parse = exports.decode = decode
exports.stringify = exports.encode = encode

exports.safe = safe
exports.unsafe = unsafe

// var eol = process.platform === "win32" ? "\r\n" : "\n"
var eol = "\r\n";

function encode (obj, opt) {
  var children = []
    , out = ""

  if (typeof opt === "string") {
    opt = {
      section: opt,
      whitespace: false
    }
  } else {
    opt = opt || {}
    opt.whitespace = opt.whitespace === true
  }

  var separator = opt.whitespace ? " = " : "="

  Object.keys(obj).forEach(function (k, _, __) {
    var val = obj[k]
    if (val && Array.isArray(val)) {
        val.forEach(function(item) {
            out += safe(k + "[]") + separator + safe(item) + "\r\n"
        })
    }
    else if (val && typeof val === "object") {
      children.push(k)
    } else {
      // añadido por mi
      var eoleol = "";
      var middleVal = val
      // *buscamos OK1212(CODIGO PARA SALTO Y LINEA) salto y linea tienen las mismas letras
      // *hacemos un buffer de out
      // *primero que encontramos, cortamos en a + b sacando el CODIGO
      // * en medio se pone salto o a la LINEA
      // se remplaza por safe middleVal haciendo safe de todos los a + b
      if (val && typeof val === "string") {
        if (val.indexOf('OK1212') >= 0) {
          // Aqui se busca codigo 0k1212 + salto/linea
          // if charat index +  5/6 s o l


            console.log("por aqui");
            console.log(val.length);
            console.log('indexof');
            console.log(val.indexOf('OK1212'));
          var finString = val;
          var indexOf = finString.indexOf('OK1212');
            console.log('charAt');
            console.log(val.charAt(indexOf + 6));
          var accumulador = '';
          var counter12 = 0
          while (indexOf >= 0) {
            var saltoLinea = '\n';
            console.log('pasa por bucle');
            if (finString.charAt(indexOf + 6) === 'S') {
              saltoLinea = '\r\n'
              console.log('salto n');
              counter12++;
              console.log(counter12);
            }
            if (finString.charAt(indexOf + 6) === 'A') {
              saltoLinea = '\r'
              console.log('salto n');
              counter12++;
              console.log(counter12);
            }
            accumulador += safe(finString.slice(0, indexOf)) + saltoLinea;
            finString = finString.slice(indexOf + 11);
            indexOf = finString.indexOf('OK1212');
            console.log('accu');
            console.log(accumulador);
            console.log('fins');
            console.log(finString);
            console.log('index');
            console.log(indexOf);


          }
          accumulador += safe(finString)
          // eoleol = "\r\n";
          // middleVal = val.slice(0, val.length - 5);
          console.log(val);
          middleVal = accumulador;
          console.log("middleVal");
          console.log(middleVal);
        }

      }

      if (accumulador) {
        console.log('------');
        console.log(accumulador);
        out += safe(k) + separator + accumulador + eol
      }
      else {
        out += safe(k) + separator + safe(val) + eol
      }
    }
  })

  if (opt.section && out.length) {
    // out = "[" + safe(opt.section) + "]" + eol + "\n" + out
    out = "[" + safe(opt.section) + "]" + eol + out
  }

  children.forEach(function (k, _, __) {
    var nk = dotSplit(k).join('\\.')
    var section = (opt.section ? opt.section + "." : "") + nk
    var child = encode(obj[k], {
      section: section,
      whitespace: opt.whitespace
    })
    if (out.length && child.length) {
      // out += eol
    }
    out += child
  })

  return out
}

function dotSplit (str) {
  return str.replace(/\1/g, '\u0002LITERAL\\1LITERAL\u0002')
         .replace(/\\\./g, '\u0001')
         .split(/\./).map(function (part) {
           return part.replace(/\1/g, '\\.')
                  .replace(/\2LITERAL\\1LITERAL\2/g, '\u0001')
        })
}

function decode (str) {
  var out = {}
    , p = out
    , section = null
    , state = "START"
           // section     |key = value
    , re = /^\[([^\]]*)\]$|^([^=]+)(=(.*))?$/i
    , lines = str.split(/[\r\n]+/g)
    , section = null

  lines.forEach(function (line, _, __) {
    if (!line || line.match(/^\s*[;#]/)) return
    var match = line.match(re)
    if (!match) return
    if (match[1] !== undefined) {
      section = unsafe(match[1])
      p = out[section] = out[section] || {}
      return
    }
    var key = unsafe(match[2])
      , value = match[3] ? unsafe((match[4] || "")) : true
    switch (value) {
      case 'true':
      case 'false':
      case 'null': value = JSON.parse(value)
    }

    // Convert keys with '[]' suffix to an array
    if (key.length > 2 && key.slice(-2) === "[]") {
        key = key.substring(0, key.length - 2)
        if (!p[key]) {
          p[key] = []
        }
        else if (!Array.isArray(p[key])) {
          p[key] = [p[key]]
        }
    }

    // safeguard against resetting a previously defined
    // array by accidentally forgetting the brackets
    if (Array.isArray(p[key])) {
      p[key].push(value)
    }
    else {
      p[key] = value
    }
  })

  // {a:{y:1},"a.b":{x:2}} --> {a:{y:1,b:{x:2}}}
  // use a filter to return the keys that have to be deleted.
  Object.keys(out).filter(function (k, _, __) {
    if (!out[k] || typeof out[k] !== "object" || Array.isArray(out[k])) return false
    // see if the parent section is also an object.
    // if so, add it to that, and mark this one for deletion
    var parts = dotSplit(k)
      , p = out
      , l = parts.pop()
      , nl = l.replace(/\\\./g, '.')
    parts.forEach(function (part, _, __) {
      if (!p[part] || typeof p[part] !== "object") p[part] = {}
      p = p[part]
    })
    if (p === out && nl === l) return false
    p[nl] = out[k]
    return true
  }).forEach(function (del, _, __) {
    delete out[del]
  })

  return out
}

function isQuoted (val) {
  return (val.charAt(0) === "\"" && val.slice(-1) === "\"")
         || (val.charAt(0) === "'" && val.slice(-1) === "'")
}

function safe (val) {
  return ( typeof val !== "string"
         || val.match(/[=\r\n]/)
         || val.match(/^\[/)
         || (val.length > 1
             && isQuoted(val))
         || val !== val.trim() )
         ? JSON.stringify(val)
         : val.replace(/#/g, "\\#")
}

function unsafe (val, doUnesc) {
  val = (val || "").trim()
  if (isQuoted(val)) {
    // remove the single quotes before calling JSON.parse
    if (val.charAt(0) === "'") {
      val = val.substr(1, val.length - 2);
    }
    try { val = JSON.parse(val) } catch (_) {}
  } else {
    // walk the val to find the first not-escaped ; character
    var esc = false
    var unesc = "";
    for (var i = 0, l = val.length; i < l; i++) {
      var c = val.charAt(i)
      if (esc) {
        if ("\\;#".indexOf(c) !== -1)
          unesc += c
        else
          unesc += "\\" + c
        esc = false
      } else if (";#".indexOf(c) !== -1) {
        break
      } else if (c === "\\") {
        esc = true
      } else {
        unesc += c
      }
    }
    if (esc)
      unesc += "\\"
    return unesc
  }
  return val
}