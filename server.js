
'use strict'

const express = require('express');
const app     = express();
const msg     = require('gulp-messenger');
const chalk   = require('chalk');
// const Twig    = require('twig');
const _       = require('lodash');
const stripe  = require('stripe')('YOUR_SK_LIVE');
const bodyParser = require('body-parser');
const firebaseAdmin = require('./firebase/firebase');
const cors = require('cors');

const firebaseAdminDb = firebaseAdmin.database();
const Client = require('ftp');
const fs = require('fs');

const TMClient = require('textmagic-rest-client');

var cSMS = new TMClient('YOUR_USER_NAME', 'YOUR_KEY');



// const firebaseAdminAuth = firebaseAdmin.auth();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));




const SparkPost = require('sparkpost');
const sparky = new SparkPost('YOUR ID');

const mochDataSpark = {
    idpedido: "4321",
     nombre: "Juan",
     hora: "22h15",
     fecha: "30 Ago 2017",
     subtotal: "20",
     total: "21",
     entrega: "1",
     descuento: "0",
     platos: [{precio: "1"},{precio: 2},{precio: 4},{precio: 5}],
     carrito: [{title: "pizza1", precio:"3"},{title: "pizza2", precio:"3"}, {title: "pizza2", precio:"3", extras:[{title:"chorizo", price:"0.5"}, {title:"bacon", price:"0.5"}]}]
};


function carritoParaEmail(carrito) {
  // lo paso a array
  const carritoArray = _.values(carrito);
  const carritoArrayTratado = [];
  carritoArray.map((e, i) => {
    var arrayExtras = [];
    var counterHack = 5;
    if (e.tipo === 'menus') {
      counterHack = 0;
      arrayExtras.push({
        title: e.bebida,
        cantidad: 1,
        price: (0).toFixed(2).replace('.', ',')
      });
    }
    if (e.extras) {
      e.extras.map(extra => {
        if (extra.cantidad > 0) {

          if (extra.title !== 'Orégano') {
            counterHack++;
          }
          if (counterHack === 1) {
            if (extra.cantidad === 1) {
              arrayExtras.push({
                title: extra.cantidad + ' * ' + extra.title,
                cantidad: extra.cantidad,
                price: (0).toFixed(2).replace('.', ',')
              });
              return;
            }
            if (extra.cantidad === 2) {
              arrayExtras.push({
                title: extra.cantidad + ' * ' + extra.title,
                cantidad: extra.cantidad,
                price: (0).toFixed(2).replace('.', ',')
              });
              return counterHack++;
            }
          }
          if (counterHack === 2) {
            if (extra.cantidad === 1) {
              arrayExtras.push({
                title: extra.cantidad + ' * ' + extra.title,
                cantidad: extra.cantidad,
                price: (0).toFixed(2).replace('.', ',')
              });
              return;
            }
            if (extra.cantidad === 2) {
              arrayExtras.push({
                title: 1 + ' * ' + extra.title,
                cantidad: 1,
                price: extra.price.toFixed(2).replace('.', ',')
              });
              arrayExtras.push({
                title: 1 + ' * ' + extra.title,
                cantidad: 1,
                price: (0).toFixed(2).replace('.', ',')
              });
              return;
            }
          }

          let precioTotal = extra.price * extra.cantidad;

          arrayExtras.push({
            title: extra.cantidad + ' * ' + extra.title,
            cantidad: extra.cantidad,
            price: precioTotal.toFixed(2).replace('.', ',')
          });
        }
      });
    }
    carritoArrayTratado.push({
      title: e.title,
      precio: e.precio.toFixed(2).replace('.', ','),
      extras: arrayExtras
    });
  })
  return carritoArrayTratado;

}

function enviaSMS(texto, tel) {
  cSMS.Messages.send({text: texto, phones:tel}, function (err, res){
      console.log('Messages.send()', err, res); // THIS SHOULD BE REFRACTORED
  });
}

function sendOrderEmail(email, subsData) {
  sparky.transmissions.send({
      // options: {
      //   sandbox: true
      // },
      content: {
          template_id: 'pedido1',
      },
      substitution_data: subsData,
      recipients: [
        {address: email},
        {address: 'YOUR@EMAIL.com', header_to: email}
      ]
    })
    // .then(data => {
    //   console.log('EMAIL SENT!');  // TESTER
    //   console.log(data);
    // })
    .catch(err => {
      console.log('ERROR');
      console.log(err);
    });
  return console.log('enviado F'); // TESTER
}

// sendOrderEmail('email@email.com', mochDataSpark);
/////////////////////////////////// *EMAIL /////////////////////////////////////////


/////////////  -- THIS PART IS FOR SAVING AN INI INTO AN FTP, THE PARSER IS IN CASE YOUR INI IS NOT UTF-8-- //////
// const ftpConfig = {
//   host: 'IP',
//   port: '2121',
//   user: 'YOUR_USER',
//   password: 'YOUR_PASS'
// };
//
// function saveToFTP(content, name) {
//   var c = new Client();
//   c.on('ready', function () {
//     var nombre = name + '.ORDER';
//     c.put(content, nombre, function (err) {
//       if (err) console.log(err);
//       c.end();
//     });
//   });
//   // connect to localhost:2121 as anonymous
//   c.connect(ftpConfig);
//   return console.log('guardado correctamente');
// }
// saveToFTP();
// personal ini parser
// var ini = require('./mi-parser');


/*
-- Cobra
*/
var issue2options = {
  origin: true,
  methods: ['POST'],
  credentials: true,
  maxAge: 3600
};

app.options('/nologchargecard', cors(issue2options));
app.post('/nologchargecard', cors(issue2options), function (req, res) {


  const stripeToken = req.body.stripeToken;
  const amount = req.body.amount;
  const metaStripe = req.body.metaDatos;
  const pedido = req.body.pedido;

  stripe.charges.create({
    card: stripeToken,
    currency: 'eur',
    amount: amount,
    description: 'No logged y pago en tarjeta',
    metadata: metaStripe
  }).then(function (charge) {
    return firebaseAdminDb.ref().child('pagos').push({
      pago:'tarjeta',
      cantidad: amount,
      referenciaStripe: charge.id
    })
  }).then(function (pago) {
    return pago.once('value');
  }).then(function (pagoSnap) {
    var newPedido = Object.assign({}, pedido, {idPagos: pagoSnap.key});
    return firebaseAdminDb.ref().child('pedidos').push(newPedido);
  }).then(function (pedido) {
      return pedido.once('value');
  }).then(function (pedidoSnap) {
    res.send({idPedido:pedidoSnap.key})
  }).catch(function (err) {
    res.send(err.message);
  })
});




/*

estrucutra de charge
0) verificar pedido
1) payAndSaveStripe -> objeto pago:efectivo o charge de stripe
2)
3) then -> saveOrderToFirebase --> pedidoSnap (coger.key) {idPedido:pedidoSnap.key}
4) then -> res.send y return saveTo FIRBEBASE

*/
///// DELIVERY ---- SI ES A CASA SE USA EL CASO !shouldSaveDirection ////
function payAndSaveStripe(enTarjeta, newCard, guardarTarjeta, newStripeCustomer, cardToken, stripeUser, metaStripe, amount, userID, userEmail, metaCard, cardType) {
  if (!enTarjeta) { return new Promise((resolve) => { resolve({pago: 'efectivo'}); }); }
  if (amount === 0) { return new Promise((resolve) => { resolve({pago: 'zero'}); }); }
  if (!newCard) {

    return stripe.charges.create({
      card: cardToken,
      currency: 'eur',
      amount: amount,
      description: 'Logged y pago en tarjeta antigua',
      customer:stripeUser,
      metadata: metaStripe
    }).catch((err) => { throw err });
  }

  if (!guardarTarjeta) {
    return stripe.charges.create({
      card: cardToken,
      currency: 'eur',
      amount: amount,
      description: 'Logged y pago en tarjeta antigua',
      metadata: metaStripe
    }).catch((err) => { throw err });
  }

  if (newStripeCustomer) {
    return stripe.customers.create({
      email: userEmail
    }).then(function (customer){
      return firebaseAdminDb.ref().child('usuarios').child(userID).child('stripeID').set(customer.id);
    }).then(function () {
      return firebaseAdminDb.ref().child('usuarios').child(userID).child('stripeID').once('value');
    }).then(function (customerID){
      const idCliente = customerID.val();
      return stripe.customers.createSource(idCliente, {
        source:cardToken
      });
    }).then(function (source) {

      let middleObjectCard = {
        cardID: source.id,
        expMonth: metaCard.exp_month,
        expYear: metaCard.exp_year,
        lastFour: metaCard.number.substr(metaCard.number.length - 4),
        tipo: cardType
      }
      return firebaseAdminDb.ref().child('usuarios').child(userID).child('cards').push(middleObjectCard);
      // return firebaseAdminDb.ref().child('usuarios').child(userID).child('tarjetas').push(source.id);
    }).then(function (ref){
      return ref.once('value');
        //fb  .val() .key()
    }).then(function (fireSource) {
      const fireCard = fireSource.val().cardID; // tarjeta

      const fireCardPromise = Promise.resolve(fireCard);
      const getStripeIDFire = firebaseAdminDb.ref().child('usuarios').child(userID).child('stripeID').once('value');
        return Promise.all([fireCardPromise, getStripeIDFire]);
    }).then(function (valueArray){
      return stripe.charges.create({
        card: valueArray[0],
        currency: 'eur',
        amount: amount,
        description: 'new stripe customer',
        customer: valueArray[1].val(),
        metadata: metaStripe
      });
    }).catch(function (err){
      throw err;
    });
  }

  if (guardarTarjeta) {
    return stripe.customers.createSource(stripeUser, {
      source: cardToken
    }).then(function (source) {
      let middleObjectCard = {
        cardID: source.id,
        expMonth: metaCard.exp_month,
        expYear: metaCard.exp_year,
        lastFour: metaCard.number.substr(metaCard.number.length - 4),
        tipo: cardType
      }
      return firebaseAdminDb.ref().child('usuarios').child(userID).child('cards').push(middleObjectCard);
    }).then(function (ref) {
      return ref.once('value');
    }).then(function (fireSource) {
      return stripe.charges.create({
        card: fireSource.val().cardID,
        currency: 'eur',
        amount: amount,
        description: 'Logged y pago en tarjeta antigua',
        customer: stripeUser,
        metadata: metaStripe
      })
    }).catch(function (err){
      throw err;
    })
  }

}

function saveOrderToFirebase(stripeCharge, pedido, amount, res) {
  if (stripeCharge.pago) {
    return firebaseAdminDb.ref().child('pagos').push({
      pago:'efectivo',
      cantidad: amount
    }).then(function (pago) {
      return pago.once('value');
    }).then(function (pagoSnap) {
      var newPedido = Object.assign({}, pedido, {idPago:pagoSnap.key});
      return firebaseAdminDb.ref().child('pedidos').push(newPedido);
    }).then(function (ref) {
      return ref.once('value');
    }).then(function (pedidoSnap) {
      return {idPedido:pedidoSnap.key};
    }).catch(function (err) {
      throw err;
    });
  }
  else {
    return firebaseAdminDb.ref().child('pagos').push({
      pago:'tarjeta',
      cantidad: amount,
      referenciaStripe: stripeCharge.id
    }).then(function (pago) {
      return pago.once('value');
    }).then(function (pagoSnap) {
      var newPedido = Object.assign({}, pedido, {idPago:pagoSnap.key});
      return firebaseAdminDb.ref().child('pedidos').push(newPedido);
    }).then(function (ref) {
      return ref.once('value');
    }).then(function (pedidoSnap) {
      return {idPedido:pedidoSnap.key};
    }).catch(function (err) {
      throw err;
    });
  }
}

function saveRestToFirebase(isAuth, userID, shouldSaveDirection, direccion, hasApuestas, apuestasArray, idPedido, creditosUsados, amount) {
  var completedApuestasArray = [];
  if (hasApuestas) {
    completedApuestasArray = apuestasArray.map(function (e, i) {
      return Object.assign({}, e, {idPedido: idPedido, creditosGanados: 'ninguno'});
    })
  }

  if (!isAuth && hasApuestas) {
    for (var i = 0; i < completedApuestasArray.length; i++) {
      firebaseAdminDb.ref().child('apuestas').push().set(completedApuestasArray[i]);
    }
    return
    // return firebaseAdminDb.ref().child('apuestas').push(completedApuestasArray);
  }

  if (!isAuth && !hasApuestas) { return }

  if (isAuth) {
    if (!hasApuestas && !shouldSaveDirection) {
      return firebaseAdminDb.ref().child('usuarios').child(userID).child('pedidos').push(idPedido)
      .then(function () {
        return firebaseAdminDb.ref().child('usuarios').child(userID).child('creditosUsados').once('value');
      }).then(function (creditosUsadosHistorico){
        let creditosUsadosNuevos = creditosUsadosHistorico.val() + creditosUsados
        return firebaseAdminDb.ref().child('usuarios').child(userID).update({creditosUsados: creditosUsadosNuevos});
      }).then(function () {
        return firebaseAdminDb.ref().child('usuarios').child(userID).child('ecoPoints').once('value');
      }).then(function (ecoPoints){
        let nuevoEcoPoint = ecoPoints.val() - (creditosUsados * 100) + Math.round(amount * 0.03)
        return firebaseAdminDb.ref().child('usuarios').child(userID).update({ecoPoints: nuevoEcoPoint});
      }).catch(function (err) { throw err });
    }

    if (!hasApuestas && shouldSaveDirection) {
      return firebaseAdminDb.ref().child('usuarios').child(userID).child('pedidos').push(idPedido)
      .then(function () {
        return firebaseAdminDb.ref().child('usuarios').child(userID).child('direcciones').push(direccion);
      }).then(function () {
        return firebaseAdminDb.ref().child('usuarios').child(userID).child('creditosUsados').once('value');
      }).then(function (creditosUsadosHistorico){
        let creditosUsadosNuevos = creditosUsadosHistorico.val() + creditosUsados
        return firebaseAdminDb.ref().child('usuarios').child(userID).update({creditosUsados: creditosUsadosNuevos});
      }).then(function () {
        return firebaseAdminDb.ref().child('usuarios').child(userID).child('ecoPoints').once('value');
      }).then(function (ecoPoints){
        let nuevoEcoPoint = ecoPoints.val() - (creditosUsados * 100) + Math.round(amount * 0.03)
        return firebaseAdminDb.ref().child('usuarios').child(userID).update({ecoPoints: nuevoEcoPoint});
      }).catch(function (err) { throw err });
    }

    if (hasApuestas && !shouldSaveDirection) {
      return firebaseAdminDb.ref().child('usuarios').child(userID).child('pedidos').push(idPedido)
      .then(function () {
        for (var i = 0; i < completedApuestasArray.length; i++) {
          firebaseAdminDb.ref().child('apuestas').push().set(completedApuestasArray[i]);
        }
        return
      }).then(function () {
        return firebaseAdminDb.ref().child('usuarios').child(userID).child('creditosUsados').once('value');
      }).then(function (creditosUsadosHistorico){
        let creditosUsadosNuevos = creditosUsadosHistorico.val() + creditosUsados
        return firebaseAdminDb.ref().child('usuarios').child(userID).update({creditosUsados: creditosUsadosNuevos});
      }).then(function () {
        return firebaseAdminDb.ref().child('usuarios').child(userID).child('ecoPoints').once('value');
      }).then(function (ecoPoints){
        let nuevoEcoPoint = ecoPoints.val() - (creditosUsados * 100) + Math.round(amount * 0.03)
        return firebaseAdminDb.ref().child('usuarios').child(userID).update({ecoPoints: nuevoEcoPoint});
      }).catch(function (err) { throw err });
    }

    if (hasApuestas && shouldSaveDirection) {
      return firebaseAdminDb.ref().child('usuarios').child(userID).child('pedidos').push(idPedido)
      .then(function () {
        return firebaseAdminDb.ref().child('usuarios').child(userID).child('creditosUsados').once('value');
      }).then(function (creditosUsadosHistorico){
        let creditosUsadosNuevos = creditosUsadosHistorico.val() + creditosUsados
        return firebaseAdminDb.ref().child('usuarios').child(userID).update({creditosUsados: creditosUsadosNuevos});
      }).then(function () {
        return firebaseAdminDb.ref().child('usuarios').child(userID).child('ecoPoints').once('value');
      }).then(function (ecoPoints){
        let nuevoEcoPoint = ecoPoints.val() - (creditosUsados * 100) + Math.round(amount * 0.03)
        return firebaseAdminDb.ref().child('usuarios').child(userID).update({ecoPoints: nuevoEcoPoint});
      }).then(function () {
        return firebaseAdminDb.ref().child('usuarios').child(userID).child('direcciones').push(direccion);
      }).then(function () {
        for (var i = 0; i < completedApuestasArray.length; i++) {
          firebaseAdminDb.ref().child('apuestas').push().set(completedApuestasArray[i]);
        }
        return
      }).catch(function (err) { throw err });
    }
  }
}

app.options('/chargemaster', cors(issue2options));
app.post('/chargemaster',cors(issue2options) ,function (req, res) {

    var body = req.body;
    var direccion = body.direccion;
    var entregaAmount = 0;
    var deliFlag = body.deliFlag;
    if (deliFlag === 'delivery') {
      entregaAmount = 1;
    }
    var amount = Math.round(body.amount * 100);
    var apellidos = body.apellidos;
    var apuestasArray = body.apuestasArray;
    var cardToken = body.cardToken;
    var carrito = body.carrito;
    var comentario = body.comentario;
    var creditosUsados = body.creditosUsados;
    var enTarjeta = body.enTarjeta;
    var fecha = body.fecha;
    var hasApuestas = body.hasApuestas;
    var horaHecho = body.horaHecho;
    var horaPedido = body.horaPedido;
    var isAuth = body.isAuth;
    var newCard = body.newCard;
    var newStripeCustomer = body.newStripeCustomer;
    var nombre = body.nombre;
    var shouldSaveAddress = body.shouldSaveAddress;
    var shouldSaveCard = body.shouldSaveCard;
    var stripeUser = body.stripeUser;
    var  subTotal = body.subTotal;
    var telefono = body.telefono;
    var userEmail = body.userEmail;
    var metaCard = body.metaCard;
    var cardType = body.cardTipe;
    var userID = body.userID;
    var formaDePago = 'efectivo';
    var userPedido = 'anónimo';
    var email = body.email;
    var telSMS = 'YOUR PHONE FOR VERIFICATION';
    var textSMS = 'Pedido confirmado, gracias, Nombre:' + nombre + 'email: ' + email; // SMS TEXT
    if (isAuth) { userPedido = userID; }
    if (enTarjeta) { formaDePago = 'tarjeta'; }
    let address = direccion.direccion + ' esc.' + direccion.escalera + ' piso' + direccion.piso + ' puerta' + direccion.puerta

    var pedido = {
      carrito: carrito,
      creditosUsados: creditosUsados,
      comentario: comentario,
      direccion: address,
      fecha: fecha,
      horaHecho: horaHecho,
      horaPedido: horaPedido,
      idPago: '',
      pago: formaDePago,
      subTotal: subTotal,
      telefono: telefono,
      total: amount,
      user: userID,
      zonaDelivery: direccion.zonaDelivery
    };
    if (email) {
      pedido.email = email;
    }
    if (!userID) {
      pedido.user = nombre;
    }
    let metaStripe = {
      nombre: nombre,
      apellidos: apellidos,
      email: userEmail,
      telefono: telefono,
      direccion: address
    };
    let direccionParaEmail = 'A recoger en tienda';
    if (deliFlag === 'delivery') { direccionParaEmail = address; }
    let metaEmail = {
      pedido: '1234',
      nombre: nombre,
      hora: horaPedido,
      fecha: fecha,
      subtotal: subTotal.toFixed(2).replace('.', ','),
      total: (amount / 100).toFixed(2).replace('.', ','),
      entrega: (1).toFixed(2).replace('.', ','),
      descuento: creditosUsados.toFixed(2).replace('.', ','),
      carrito: carritoParaEmail(carrito),
      direccion: direccionParaEmail,
      formadepago: formaDePago,
    }

    // var stripeToken = req.body.stripeToken;
    // var amount = 1000;

    payAndSaveStripe(enTarjeta, newCard, shouldSaveCard, newStripeCustomer, cardToken, stripeUser, metaStripe, amount, userID, userEmail, metaCard, cardType)
    .then(function (pagoOStripeCharge) {
      return saveOrderToFirebase(pagoOStripeCharge, pedido, amount, res);
    }).then(function (pedidoObject) {
      res.send(pedidoObject);
      return pedidoObject.idPedido;
    }).then(function (idPedido) {
      return saveRestToFirebase(isAuth, userID, shouldSaveAddress, direccion, hasApuestas, apuestasArray, idPedido, creditosUsados, amount)
    }).then(function () {
      if (!userEmail) {
        userEmail = email
      }
      return sendOrderEmail(userEmail, metaEmail)
    }).then(function () {
        return enviaSMS(textSMS, telSMS)
    }).catch(function (err) {
    });

    return
});



function noLoggedAndChargeOld(stripeToken, amount, metaStripe, pedido, userID, req, res) {
  return   stripe.charges.create({
      card: stripeToken,
      currency: 'eur',
      amount: amount,
      description: 'Logged y pago en tarjeta antigua',
      customer:'cus_9cEmktexFXWcIo',
      metadata: metaStripe
    }).then(function (charge) {
      return firebaseAdminDb.ref().child('pagos').push({
        pago:'tarjeta',
        cantidad: amount,
        referenciaStripe: charge.id
      })
    }).then(function (pago) {
      return pago.once('value');
    }).then(function (pagoSnap) {
      var newPedido = Object.assign({}, pedido, {idPagos: pagoSnap.key});

      return firebaseAdminDb.ref().child('pedidos').push(newPedido);
    }).then(function (pedido) {
        return pedido.once('value');
    }).then(function (pedidoSnap) {

        return firebaseAdminDb.ref().child('usuarios').child(userID).child('pedidos').push(pedidoSnap.key);
    }).then(function (pedido) {
        return pedido.once('value');
    }).then(function (pedidoSnap) {
      return {idPedido:pedidoSnap.key}
    }).catch(function (err) {
      res.send({error:err.message});
      throw err;
    });
}


// SIMPLE API TESTER
app.get('/pruebaapi', function (req,res){
  res.send('la api funciona tete')
});

/*
-- Creates new Stripe customer and charge
*/
app.post('/customerandcharge', function (req,res){
  const emilio = 'your@email.com';
  const cantidad = 3000;
  const stripeToken2 = req.body.stripeToken;

  stripe.customers.create({
    email: emilio
  }).then(function (customer){
    return stripe.customers.createSource(customer.id, {
      source:stripeToken2
    });
  }).then(function (source){
    return stripe.charges.create({
      amount:cantidad,
      currency:'usd',
      customer: source.customer
    });
  }).then(function (charge){
  }).catch(function (err){
    console.log(err);  //res.send ...
  });
});

/*
-- Recupera las tarjetas dado un cliente
*/

app.get('/customercards', function (req,res){
  const userTokenToGet = 'cus_9cLcErMasMI4eu';

  stripe.customers.retrieve(userTokenToGet, function (customer){
    res.send(customer.sources)
  }).catch(function (err){
    res.send(err)
  });
});


// STRIPE TESTER
// Custom routes (not convered by static files)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/minimalstripe.html');
});
app.use(express.static(__dirname));
var port = process.env.PORT || 8000;
app.listen(port, function () {
  console.log('app running on port ' + port);
});
