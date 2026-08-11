// payments.js – manejo del proceso de pago (módulo)
// export initPayments(getCartFn, clearCartFn, onSaleDone)
export function initPayments(getCartFn, clearCartFn, onSaleDone) {
    const modal = document.getElementById("modal-payment");
    const btnClose = document.getElementById("close-payment");
    const btnConfirm = document.getElementById("confirm-payment");
    const inputs = Array.from(document.querySelectorAll(".pay-input"));
    const totalLabel = document.getElementById("pay-total-pro");
    const changeLabel = document.getElementById("change-pro");
    const paidLabel = document.getElementById("total-paid-pro");
    const breakdownEl = document.getElementById("breakdown");
    const printAsk = document.getElementById("modal-print-ask");

    let currentSaleTotal = 0;
    let currentCart = [];

    function fmtMX(n){ return Number(n||0).toLocaleString('es-MX', { style:'currency', currency:'MXN' }); }

    // define global opener used by main.js
    window.openPayment = function(total, cartData){
        currentSaleTotal = total;
        currentCart = cartData || getCartFn();
        if(totalLabel) totalLabel.textContent = fmtMX(total);
        if(paidLabel) paidLabel.textContent = fmtMX(0);
        if(changeLabel) changeLabel.textContent = fmtMX(0);
        if(breakdownEl) breakdownEl.innerHTML = '';
        inputs.forEach(i => i.value = '');
        if(modal) modal.classList.remove('hidden');
        // focus first
        if(inputs[0]) inputs[0].focus();
    };

    // calcular y actualizar UI
    function calcularPago(){
        let totalPagado = 0;
        const cash = Number(document.getElementById('pay-cash-pro')?.value || 0);
        const card = Number(document.getElementById('pay-card-pro')?.value || 0);
        const transfer = Number(document.getElementById('pay-transfer-pro')?.value || 0);
        totalPagado = cash + card + transfer;
        const cambio = totalPagado - currentSaleTotal;
        if(paidLabel) paidLabel.textContent = fmtMX(totalPagado);
        if(changeLabel) changeLabel.textContent = fmtMX(cambio >= 0 ? cambio : 0);
        if(breakdownEl){
            breakdownEl.innerHTML = `
                <div>Efectivo: ${fmtMX(cash)}</div>
                <div>Tarjeta: ${fmtMX(card)}</div>
                <div>Transferencia: ${fmtMX(transfer)}</div>
            `;
        }
        return { totalPagado, cambio, cash, card, transfer };
    }

    inputs.forEach(i => {
        i.addEventListener('input', () => calcularPago());
        i.addEventListener('blur', ()=> {
            const v = Number(i.value || 0);
            i.value = v ? v.toFixed(2) : '';
            calcularPago();
        });
    });

    // cerrar modal
    if(btnClose) btnClose.addEventListener('click', ()=> modal && modal.classList.add('hidden'));

    // confirmar venta
    btnConfirm.addEventListener('click', () => {
	 if  (typeof  window.updateTicketNumber ===  "function")  {
        	window.updateTicketNumber();
	}  else  if  (typeof window.actualizarTicketDisplay  ===  "function")  {
	       window.actualizarTicketDisplay();
	}

        const { totalPagado, cambio, cash, card, transfer } = calcularPago();


  // ====================================================================
  // 🔒 BLOQUEO PERIMETRAL DE COBRO: ANULACIÓN DE FUGAS FINANCIERAS
  // Usamos 'total' que es la variable nativa real de tu sistema
  // ====================================================================
  
  // ❌ CANDADO 1: Bloqueo absoluto si el dinero es insuficiente
  if (totalPagado < currentSaleTotal) {
      const faltante = currentSaleTotal - totalPagado;
      alert(`❌ OPERACIÓN RECHAZADA:\nEl monto ingresado (${fmtMX(totalPagado)}) es insuficiente para liquidar el total de la venta (${fmtMX(currentSaleTotal)}).\nFaltan ${fmtMX(faltante)} por cubrir.`);
      return; // 🛑 Detiene el flujo de forma definitiva. Impide registrar la venta.
  }

  // 🔒 CANDADO 2: CONTROL ESTRICTO DE CANALES ELECTRÓNICOS (PAGO ÚNICO EXACTO)
  // Caso A: Pago único exclusivo con Tarjeta (card)
  if (card > 0 && cash === 0 && transfer === 0) {
      if (card !== currentSaleTotal) {
          alert(`❌ ERROR DE COBRO DE TARJETA:\nLos pagos electrónicos únicos deben ser por el monto EXACTO de la venta.\nTotal venta: ${fmtMX(currentSaleTotal)} | Ingresado: ${fmtMX(card)}.\nPor favor, corrige el valor antes de continuar.`);
          return;
      }
  }

  // Caso B: Pago único exclusivo con Transferencia (transfer)
  if (transfer > 0 && cash === 0 && card === 0) {
      if (transfer !== currentSaleTotal) {
          alert(`❌ ERROR DE COBRO DE TRANSFERENCIA:\nLos pagos electrónicos únicos deben ser por el monto EXACTO de la venta.\nTotal venta: ${fmtMX(currentSaleTotal)} | Ingresado: ${fmtMX(transfer)}.\nPor favor, corrige el valor antes de continuar.`);
          return;
      }
  }

  // ====================================================================
  // 🔥 CANDADO 3: BLINDAJE DE PAGO MIXTO MULTICANAL (EVITA CAMBIOS FALSOS)
  // ====================================================================
  if (card > 0 || transfer > 0) {
      const dineroDigitalTotal = card + transfer;

      // Regla de Oro: Lo cobrado en terminales digitales jamás puede superar el total original
      if (dineroDigitalTotal > currentSaleTotal) {
          alert(`❌ PAGO MIXTO RECHAZADA:\nEl dinero digital cobrado en tarjeta/transferencia (${fmtMX(dineroDigitalTotal)}) no puede superar el total de la venta (${fmtMX(currentSaleTotal)}).\nLas terminales electrónicas no generan cambio en efectivo.`);
          return; 
      }

      // Regla de Plata: Control de excedentes en efectivo
      if (cash > 0) {
          // Escenario A: El efectivo por sí solo ya cubrió o superó el total de la compra
          if (cash >= currentSaleTotal) {
              const cambioReal = cash - currentSaleTotal;
              alert(`❌ ERROR DE BALANCE MIXTO:\nEl dinero en efectivo ingresado (${fmtMX(cash)}) ya cubre por completo el total de la venta (${fmtMX(currentSaleTotal)}) generando un cambio real de ${fmtMX(cambioReal)}.\nNo es posible añadir montos en Tarjeta o Transferencia a esta transacción.`);
              return;
          }

          // Escenario B: El efectivo cubre una parte, validamos que lo digital no genere cambio falso
          const maximoDigitalPermitido = currentSaleTotal - cash;
          if (dineroDigitalTotal > maximoDigitalPermitido) {
              alert(`❌ ERROR DE BALANCE MIXTO:\nSi el cliente paga ${fmtMX(cash)} en efectivo, el monto máximo permitido para tarjeta/transferencia es de ${fmtMX(maximoDigitalPermitido)}.\nActualmente ingresaste ${fmtMX(dineroDigitalTotal)} en digital, lo que genera un cambio falso.`);
              return;
          }
      }

}


        // construir venta
        const ventas = DB.getSales();
        // ticket seq almacenado en localStorage
        const seq = Number(localStorage.getItem('pos_ticket_seq') || '0') + 1;
        localStorage.setItem('pos_ticket_seq', String(seq));
	window.ticketSeq = seq;  // actualiza variable global
	if (window.actualizarTicketDisplay) window.actualizarTicketDisplay();

        const sale = {
            id: Date.now(),
            ticket: seq,
            fecha: new Date().toISOString(),
            items: currentCart,
            total: currentSaleTotal,
            payments: { efectivo: cash, tarjeta: card, transferencia: transfer },
            pagado: totalPagado,
            cambio: cambio >= 0 ? cambio : 0,
            // 2. SOLUCIÓN DE IDENTIDAD: Forzamos la lectura unificada desde SessionStorage
            cashier: sessionStorage.getItem('pos_cashier'),
            vendedor: sessionStorage.getItem('pos_cashier'),
            usuario: sessionStorage.getItem('pos_cashier')        };

        // ajuste stock si existe
        const artList = DB.getArticles();
        sale.items.forEach(it => {
            const art = artList.find(a => a.codigo === it.codigo);
            if (art) {
                art.stock = Math.max(0, (art.stock || 0) - (it.cantidad || it.qty || 1));
            }
        });
        DB.saveArticles(artList);

        ventas.unshift(sale);
        DB.saveSales(ventas);
	if (typeof window.updateTicketNumber === "function") {
	    window.updateTicketNumber();
	}

        // cerrar modal
        modal && modal.classList.add('hidden');
        
	// preguntar imprimir usando modal pequeño
        if(printAsk) {
            printAsk.classList.remove('hidden');
            // handlers
        //  generar  HTML  del  ticket  igual  que  en  main.js
       const  html  =  `
                <div  class="ticket">
                        <h2  style="text-align:center">MEET  FASHION</h2>
                       <div>${new  Date(sale.fecha).toLocaleString()}  •  Ticket:  ${sale.ticket}</div>
                        <hr>
                        <div>
                               ${sale.items.map(it  =>  {
                                        const  qty  = it.cantidad  ||  it.qty  ||  1;
                                        return  `<div  style="display:flex;justify-content:space-between;">
                                               <span>${it.nombre}  x${qty}</span>
                                               <span>${fmtMX((it.precio  ||  0)  *  qty)}</span>
                                        </div>`;
                               }).join('')}
                        </div>
                        <hr>
                       <div>Total:  ${fmtMX(sale.total  ||  0)}</div>
                        <div>Pagado:  ${fmtMX(sale.pagado  ||  0)}</div>
                        <div>Cambio:  ${fmtMX(sale.cambio  ||  0)}</div>
                       <hr>
                        <div  style="text-align:center;">¡Gracias  por  su  compra!</div>
                </div>
       `;

        //  Insertar  preview  en el  modal
        const  preview  = document.getElementById("print-preview");
        if  (preview)  preview.innerHTML  = html;

	//IMPRIMIR CONFIRMA QUE SI
            const onYes = () => {
	        //  usar  el  mismo  patrón  que  main.js
	        if  (typeof  window.printTicketHTML  ===  "function")  {
        	       window.printTicketHTML(html);
	        }  else  {
        	        const  w  =  window.open('',  '_blank');
                	w.document.write(html);
	                w.document.close();
         	       w.print();
                	w.close();
	        }

		 if  (typeof  window.updateTicketNumber ===  "function")  {
	        	window.updateTicketNumber();
		}  else  if  (typeof window.actualizarTicketDisplay  ===  "function")  {
	       		window.actualizarTicketDisplay();
		}

	        printAsk.classList.add('hidden');
	        cleanup();
            };

	//IMPRIMIR CONFIRMA QUE NO
            const onNo = () => { 
		printAsk.classList.add('hidden');
		cleanup(); 
		 if  (typeof  window.updateTicketNumber ===  "function")  {
        		window.updateTicketNumber();
		}  else  if  (typeof window.actualizarTicketDisplay  ===  "function")  {
		       window.actualizarTicketDisplay();
		}
	    };



            document.getElementById('print-yes').onclick = onYes;
            document.getElementById('print-no').onclick = onNo;

            // allow keyboard
            function onKey(e){
                if(e.key === 'Enter') onYes();
                if(e.key === 'Escape') onNo();
            }
            document.addEventListener('keydown', onKey, { once: true });
        } else {
            if (typeof window.showTicket === 'function') window.showTicket(sale);
            cleanup();
        }

        // limpiar carrito en UI
        if(typeof clearCartFn === 'function') clearCartFn();

        // callback al main (opcional)
        if (typeof onSaleDone === 'function') {
            try { onSaleDone(sale); } catch(e){ console.warn(e); }
        }

        function cleanup(){
            // nothing for now
        }
    });

    // expose nothing else
}
