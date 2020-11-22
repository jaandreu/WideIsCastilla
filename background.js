//let proxyurl = "https://dodax-proxy.herokuapp.com/";
let proxyurl = "";

//JSON con los tipos de cambio de las monedas.
let rates = null;

//Parser para tratar el html que obtenemos.
let parser = new DOMParser();

//Listado de servidores a los que consultaremos.
const urlsDodax = [
    {
   text: "AT",
   url: "https://www.dodax.at",
   all: "/de-at/search/"
 },
 {
   text: "DE",
   url: "https://www.dodax.de",
   all: "/de-de/search/"
   },
  {
    text: "FR",
    url: "https://www.dodax.fr",
    all: "/fr-fr/search/"
  },
  {
    text: "UK",
    url: "https://www.dodax.co.uk",
    all: "/en-gb/search/"
  }, 
  {
    text: "ES",
    url: "https://www.dodax.es",
    all: "/es-es/search/"
  }, 
 {
    text: "IT",
    url: "https://www.dodax.it",
    all: "/it-it/search/"
  },
  {
    text: "PL",
    url: "https://www.dodax.pl",
    all: "/pl-pl/search/"
  }, 
  {
    text: "NL",
    url: "https://www.dodax.nl",
    all: "/nl-nl/search/"
  }
 ];

//Obtiene la lista de servidores a los que nos conectaremos.
const getUrlsDodax = function (pais){

    return  urlsDodax
                .map(urlDodax => {
                    return {
                        url: urlDodax.url,
                        text: urlDodax.text,
                        params: urlDodax.all  + "?s="
                    };
                });
  };



//Obtiene un JSON con los rates de las monedas en base al EUR.
const getCurrencyRates = async () => {

    let respuesta = await fetch("https://api.exchangeratesapi.io/latest");
    let data = await respuesta.json();
    return data;

}  

  //Obtiene un importe en euros, en función de la moneda hace la conversión con el rate indicado.
  const getPrice = function (price, codigo) {
    if (rates != null) {

      switch (codigo) {
        case "UK":
          salida = (parseFloat(price.replace(",", ".")) * (1 / rates.rates["GBP"])).toFixed(2);
          break;
        case "PL":
          salida = (parseFloat(price.replace(",", ".")) * (1 / rates.rates["PLN"])).toFixed(2);
          break;
        default:
          salida = parseFloat(price.replace(",", ".")).toFixed(2);
      }
    } else {
      salida = parseFloat(price.replace(",", ".")).toFixed(2);
    }
    return salida;
  };

  //Obtiene el caracter de moneda en función del código de pais.
  const getCurrency = function (price, codigo) {
    let salida = "";
    switch (codigo) {
      case "UK":
        salida = price + " £";
        break;
      case "PL":
        salida = price + " zł";
        break;
      default:
        salida = "";

    }
    return salida;
  };

  //Devuelve la información de los albums de una url de Dodax.
  const getDodaxAlbums = async (url) => {

    const controller = new AbortController();
    const signal = controller.signal;

    //Aborta el controlador al pasar 10 segundos.
    const timer = setTimeout(() => {
      controller.abort();
    }, 10000);

    console.log("Conectando:" + url);

    let error = "Vaya! algo ha pasado...:";
    
    let respuesta = await fetch(url, { signal })
                         .finally(() => {
                              clearTimeout(timer);
                              console.log("finalizado fetch.")
                         })
                         .catch(err => {
                              error += err.name === 'AbortError' ? "timeout de la conexión." : err.message;
                         });


    return {
      status: respuesta ? respuesta.status : -1,
      data:  respuesta ? await respuesta.text() : error
    }                            

  };

  const getDodaxSitesAlbums = async (cadenaBusqueda, pais) => {

    let urls = getUrlsDodax(pais);

    const requests = urls.map((urlDodax) => {

      const urlCompleta = proxyurl + urlDodax.url + urlDodax.params + cadenaBusqueda;

      return getDodaxAlbums(urlCompleta)
        .then((salida) => {

          let vlistaAlbums = null;

           if (salida.status === 200){

            let doc = parser.parseFromString(salida.data, "text/html");
            vlistaAlbums = doc.getElementsByClassName('c-frontOfPack');
           
          }
          return {
            url : urlDodax.url
            ,params: urlDodax.params
            ,text: urlDodax.text
            ,listaAlbums: vlistaAlbums
            ,error: (salida.status !== 200 ? salida.data : "")
          };

        });
    })
    return Promise.all(requests)
  };

 //Obtiene los albums que coinciden con la cadena de búsqueda, a partir de n items (es paginado.)
 const getAlbums = function (cadenaBusqueda, pais, callback) {
       
        let salida = []
        let minPrice = 100000;
       
        getDodaxSitesAlbums(cadenaBusqueda, pais)
          .then(content => {
    
            content.forEach(resultado => {
    
              if (resultado.error !== ""){
                console.log(resultado.error);
              }
              else{
              
                  Array.from(resultado.listaAlbums).forEach(album => {
    
                    //Identificador del album
                    let idAlbum = album.getAttribute("data-product-id");

                    //Precio del disco.
                    let precio = album.getAttribute("data-product-price")
                      .replace("€", "")
                      .replace("£", "")
                      .replace("zł", "")
                      .replace(".", ",")
                      .replace(" ", "")
                      .replace(String.fromCharCode(160), "")
                      .replace("&nbsp;", "");
    
                    //Código de barras.
                    let gtin =  album.getAttribute("data-product-gtin");
    
                    //Url del detalle del disco.
                    let urlRelativa = album.getAttribute("data-product-url");
                    //Stock
                    let stockQty = album.getAttribute("data-stock-qty");
                    let typeAlbum = album.getElementsByClassName("d-none")[0].innerText;
                    let priceInt = getPrice(precio, resultado.text);

                    //Datos del precio.
                    let precioObj = {
                      url: resultado.url + urlRelativa,
                      price: getPrice(precio, resultado.text).replace(".", ","),
                      priceInt: priceInt,
                      priceOriginal: getCurrency(precio, resultado.text),
                      currency: "€",
                      text: resultado.text,
                      stock: stockQty
                    };
                    
                    if (parseFloat(minPrice) >= parseFloat(priceInt)) {
                      minPrice = parseFloat(priceInt);
                    }

                    let obj = {};
                    obj.id = idAlbum;
                    obj.title = album.getAttribute("data-product-name");
                    obj.from = album.getAttribute("data-product-brand");
                    obj.type = typeAlbum;
                    obj.price = precioObj;
                    obj.minPrice = precioObj.priceInt;
                    obj.gtin = gtin;
                    
                    salida.push(obj);
    
                  });
               }
            });

            callback(salida, minPrice);
    
          });
      };


if (rates == null){
  getCurrencyRates()
  .then((salida) => {
    rates = salida;
});
}      

chrome.runtime.onMessage.addListener(

  function(request, sender, sendResponse) {
    if (request.greeting == "GetAlbumPrices"){
      getAlbums(request.album, request.pais, function(albums, minPrice){
        console.log(albums);
        console.log(minPrice);
        sendResponse({albums: albums, minPrice: minPrice});
      });
      return true;
    }

  });
