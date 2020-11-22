
    let parser = new DOMParser();
    let albumId = document.getElementsByTagName("main")[0].getAttribute("data-product-id");
    let codPais = location.host.split(".").slice(-1)[0].toUpperCase();

    if (albumId != null){

      chrome.runtime.sendMessage({greeting: "GetAlbumPrices", album: albumId, pais: codPais }, function(response) {

        if (response !== null && response.albums != null && response.albums.length > 0){

          let menuLateral = document.getElementsByClassName("pdp-content__sideBox")[0];
          if (menuLateral !== null){
              
              let html = `<section id='plugginsection' class="pdp-sideBox my-3">
                            <div class="order-sm-1">
                              <div>
                                <table width="100%" id="pricetable"></table>
                              </div>
                            </div>
                          </section>`;

              let newSection = parser.parseFromString(html, "text/html");

              response.albums.forEach(item => {

                let trStyle = "font-size:1rem;border-bottom-width: 1px;border-bottom-style: solid; cursor:pointer; border-bottom-color: #448ccb; text-align:center;";
              
                if (item.price.priceInt == parseFloat(response.minPrice).toFixed(2)){
                  console.log(response.minPrice);
                  trStyle+="background-color:hsl(198, 83%, 94%);"
                }
                let tr = document.createElement("tr");

                    tr.setAttribute("style", trStyle);
                    tr.setAttribute("onclick", "window.location='" + item.price.url + "'");
                    tr.classList.add("link-highlighted");
                    tr.innerHTML = "<td width='10%'>" + item.price.text + "</td>"
                                 + "<td width='40%'>" + item.price.price + item.price.currency + "</td>"
                                 + "<td width='40%'>" + item.price.priceOriginal + "</td>"
                                 + "<td width='10%'>" + item.price.stock + "</td>"

                     newSection.getElementById("pricetable").appendChild(tr);

              });

              menuLateral.insertBefore(newSection.getElementById("plugginsection"), menuLateral.firstElementChild.nextElementSibling);
          }

        }


      });

    }

    