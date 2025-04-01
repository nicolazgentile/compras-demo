function drawFooter(row, data, start, end, display) {
    let api = this.api();

    // Remove the formatting to get integer data for summation
    let floatVal = function (i) {
        return typeof i === 'string'
            ? i.replace(/[\$\.]/g, '') * 1.0
            : typeof i === 'number'
            ? i
            : 0;
    };

    // Total over all pages
    total = api
        .column(4)
        .data()
        .reduce((a, b) => floatVal(a) + floatVal(b), 0);

    // Update footer
    api.column(4).footer().innerHTML = total.toLocaleString('es-ar', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2
    });
}

function getTipoDeCompra(monto) {
    return tipoCompras.find(tipo => {return monto >= tipo.desde});
}

function getPartidas() {
    var partidasArray = [];
    partidas.forEach(partida => {
        partidasArray.push(partida.partida);
    });

    return partidasArray;
}

function refreshPartidasRojas() {

    var negative =[];

    $('td.partidaColumn').each(function() {
        var td = $(this);
        if (td.text().includes('-')) {
            negative.push(td.prev().text());
        }
    });

    $('td.orderPartidaClass').each(function() {
        var td = $(this);

        if (negative.includes(td.text())) {
            $(this).css('color', 'red');
            $(this).css('font-weight', 'bold');
        } else {
            $(this).css('color', 'black');
            $(this).css('font-weight', 'lighter');
        }
    });
}

function filterPartidas() {
    var modifiedPartidas = JSON.parse(JSON.stringify(partidas));

    data1.forEach(item => {
        // Find the corresponding partida
        var partida = modifiedPartidas.find(p => p.partida === item.partida);
        if (partida) {
            // Decrement disponible by the item's precio
            partida.disponible -= item.total;
            partida.modificada = true;
        }
    });

    modifiedPartidas = modifiedPartidas.filter(partida => partida.modificada);

    return modifiedPartidas;
}

function getByAdjudication(order) {
    return data1.filter(obj => {
      return obj.orden === order;
    })
}

function reloadPedido() {
    var table = $('#myTable').DataTable();
    table.clear().draw();
    table.rows.add(getByAdjudication('NA'));
    table.columns.adjust().draw();

    $('td.partidaClass').on('click', function() {
    selectAccount($(this));
    });

    $('td.proveedorClass').on('click', function() {
        selectProveedor($(this));
    });
}

function generateDropDown(container, cell, options, evenManager, actualizarPartidas) {
    container.empty();

    var component = '<select>';
    options.forEach(function (arrayItem) {
        component += '<option value="' + arrayItem + '"';
        if (cell.data() === arrayItem)
            component += ' selected="selected"';
        component += '>' + arrayItem + '</option>';
    });
    component += '</select>';

    container.append(
        $(component).change(function() {
            cell.data(this.value);
            container.empty();
            container.append(cell.data());
            container.on('click', function() {
                evenManager($(this));
            });

            if (actualizarPartidas) {
                var table = $('#partidas').DataTable();
                table.clear().draw();
                table.rows.add(filterPartidas());
                table.columns.adjust().draw();
            }
        })
    );
}

function selectAccount(td) {
    td.off('click');
    var table = $('#myTable').DataTable();
    var cell = table.cell(td);
    generateDropDown(td, cell, getPartidas(), selectAccount, true)
}

function selectProveedor(td) {
    td.off('click');
    var table = $('#myTable').DataTable();
    var cell = table.cell(td);
    var rubro = table.row(td).data().rubro;
    generateDropDown(td, cell, proveedores[rubro], selectProveedor)
}

function addToOrden(orderName) {
    var isNew = false;
    if (orderName === 'NEW') {
        orderName = '' + Math.floor(1000 + Math.random() * 9000);
        isNew = true;
    }

    var count = 0;
    var table = $('#myTable').DataTable();

    $('#myTable input:checked').not("#selectall").each(function() {
        var item = table.row($(this).parent()).data();
        item.orden = orderName;
        count++;

    });

    if (count > 0) {
        reloadPedido();
        if (isNew)
            generateOrder(orderName);
        else {
            var orderTable = $('#' + orderName + '_table').DataTable();
            orderTable.clear().draw();
            orderTable.rows.add(getByAdjudication(orderName));
            orderTable.columns.adjust().draw();
        }
        refreshPartidasRojas();
    }
}

function updateTipoCompra(settings) {
    var monto = 0;
    var orden = settings.sTableId.substring(0, 4);
    var localItem = null;

    data1.forEach(function (item) {
        localItem = item;
        if (item.orden === orden)
            monto += item.total;
    });

    tipoCompra = getTipoDeCompra(monto);

    if (localItem.proveedor && tipoCompra.selectProveedor) {
        var proveedorSelector = '<div>Proveedor: <select>';
        proveedores[localItem.rubro].forEach(function (proveedor) {
            proveedorSelector += '<option value="' + proveedor + '"';
            if (localItem.proveedor === proveedor)
                proveedorSelector += ' selected="selected"';
            proveedorSelector += '>' + proveedor + '</option>';
        });
        proveedorSelector += '</select></div>';
        $('proveedorSelector').append(proveedorSelector);
    } else {
        $('proveedorSelector').empty();
    }

    $('#' + orden + '_h3').text(tipoCompra.sigla + '-' + orden);
    $('#' + orden + '_h2').text(tipoCompra.tipo);
    $('#addTo-' + orden + '-button').text('Agregar a ' + tipoCompra.sigla + '-' + orden);
}

function generateOrder(orderName) {

    $('#bOrders').append('<button id="addTo-' + orderName + '-button" class="ui-button ui-widget ui-corner-all" onclick="addToOrden(\'' + orderName + '\')" />');

    var div = '<div id="' + orderName + '" style="border-radius: 25px; border: 2px solid #007FFF; padding: 20px;">\
        <h3 id="' + orderName + '_h3"></h3>\
        <h2 id="' + orderName + '_h2"></h2>\
        <div id="proveedorSelector"></div>\
        <table id="' + orderName + '_table" class="display">\
          <thead>\
            <tr>\
                <th><input type="checkbox" class="select-checkbox check-all"></th>\
                <th>Item</th>\
                <th>Precio</th>\
                <th>Cantidad</th>\
                <th>Total</th>\
                <th>Partida</th>\
            </tr>\
          </thead>\
          <tfoot>\
            <tr>\
                <th></th>\
                <th></th>\
                <th></th>\
                <th>Total</th>\
                <th></th>\
                <th></th>\
            </tr>\
          </tfoot>\
        </table>\
        <a href="#" id="eliminar_item_' + orderName + '">Eliminar Items</a>  <a href="#" id="eliminar_' + orderName + '">Eliminar Orden</a> <a href="#" id="grabar' + orderName + '">Grabar</a>\
    </div><br id="br_' + orderName + '"/>';
    $('#tabs-2').append($(div));

    $('#eliminar_item_' + orderName).button();
    $('#eliminar_' + orderName).button();
    $('#grabar' + orderName).button();

    var table = $('#' + orderName + '_table').DataTable({
        select: false,
        data: getByAdjudication(orderName),
        columns: [
            {
                data: null,
                render: function (data, type, row) {
                    return '<input type="checkbox" class="select-checkbox">';
                },
                sortable: false
            },
            { data: 'item' },
            { data: 'precio', render: $.fn.dataTable.render.number('.', ',', 2, '$ ')},
            { data: 'cantidad'},
            { data: 'total', render: $.fn.dataTable.render.number('.', ',', 2, '$ ')},
            { data: 'partida', className: "orderPartidaClass"}
        ],
        language: {
            info: 'Pagina _PAGE_ de _PAGES_',
            infoEmpty: 'No hay items disponibles',
            infoFiltered: '(filtro aplicado sobre un total de _MAX_ items)',
            lengthMenu: 'Mostrar _MENU_ items por pagina',
            zeroRecords: 'No se encontraron resultados',
            search: 'Buscar:'
        },
        drawCallback: updateTipoCompra,
        footerCallback: drawFooter
    });

    $('#eliminar_item_' + orderName).on("click", function(event) {
        $('#' + orderName + '_table input:checked').not(".check-all").each(function() {
            var item = table.row($(this).parent()).data();
            item.orden = 'NA';
        });
        table.clear().draw();
        table.rows.add(getByAdjudication(orderName));
        table.columns.adjust().draw();
        reloadPedido();
        refreshPartidasRojas();
    });
    $('#eliminar_' + orderName).on("click", function(event) {
        data1.filter(obj => {return obj.orden === orderName;}).forEach(function (item) {item.orden = 'NA'});
        $('#' + orderName).remove();
        $('#br_' + orderName).remove();
        $('#addTo-' + orderName + '-button').remove();
        reloadPedido();
        refreshPartidasRojas();
    });
    $('#' + orderName + '_table .check-all').change(function() {
        $('#' + orderName + '_table .select-checkbox').prop('checked', this.checked);
    });
}

$(document).ready( function () {
    $('#tabs').tabs();

    $('#myTable').DataTable({
        select: false,
        data: getByAdjudication('NA'),
        columns: [
            {
                data: null,
                render: function (data, type, row) {
                    return '<input type="checkbox" class="select-checkbox">';
                },
                sortable: false
            },
            { data: 'item' },
            { data: 'precio', className: "editableCell", render: $.fn.dataTable.render.number('.', ',', 2, '$ '), fnCreatedCell: createdCell},
            { data: 'cantidad', className: "editableCell", fnCreatedCell: createdCell},
            { data: 'total', render: $.fn.dataTable.render.number('.', ',', 2, '$ ')},
            { data: 'proveedor', className: "proveedorClass"},
            { data: 'partida', className: "editableCell partidaClass orderPartidaClass"}
        ],
        language: {
            info: 'Pagina _PAGE_ de _PAGES_',
            infoEmpty: 'No hay items disponibles',
            infoFiltered: '(filtro aplicado sobre un total de _MAX_ items)',
            lengthMenu: 'Mostrar _MENU_ items por pagina',
            zeroRecords: 'No se encontraron resultados',
            search: 'Buscar:'
        },
        footerCallback: drawFooter
    });


    $('td.partidaClass').on('click', function() {
        selectAccount($(this));
    });

    $('td.proveedorClass').on('click', function() {
        selectProveedor($(this));
    });

    $('#selectall').change(function() {
        $('#myTable .select-checkbox').prop('checked', this.checked);
    });

    $('#partidas').DataTable({
        data: filterPartidas(),
        language: {
            info: 'Pagina _PAGE_ de _PAGES_',
            infoEmpty: 'No hay items disponibles',
            infoFiltered: '(filtro aplicado sobre un total de _MAX_ items)',
            lengthMenu: 'Mostrar _MENU_ items por pagina',
            zeroRecords: 'No se encontraron resultados',
            search: 'Buscar:'
        },
        columns: [
            { data: 'partida' },
            { data: 'disponible', render: $.fn.dataTable.render.number('.', ',', 2, '$ '), "fnCreatedCell": function (nTd, sData, oData, iRow, iCol) {
                if ( sData < 0 ) {
                    $(nTd).css('color', 'red')
                    $(nTd).css('font-weight', 'bold')
                }
            }, className: "partidaColumn"}
        ],
        drawCallback: refreshPartidasRojas
    });
});

const createdCell = function(cell) {
  cell.setAttribute('contenteditable', true);
  cell.setAttribute('spellcheck', false);

  cell.addEventListener('blur', function(e) {
    var table = $('#myTable').DataTable();
    var cell = table.cell( this );
    var td = $(this)
    var isPrecio = td.index() == 2;

    var txtVal = e.target.textContent.replaceAll(".","").replaceAll(",",".").replaceAll("$","");

    if (!isNaN(txtVal)) {
        if (isPrecio)
            cell.data(parseFloat(txtVal));
        else
            cell.data(parseInt(txtVal));
    } else {
        td.empty();
        if (isPrecio)
            td.text(
                cell.data().toLocaleString('es-ar', {
                    style: 'currency',
                    currency: 'ARS',
                    minimumFractionDigits: 2
                })
            );
        else
            td.text(cell.data());

        return;
    }
    
    var item = table.row(this).data();
    item.total = item.precio * item.cantidad;
    
    var printableTotal = item.total.toLocaleString('es-ar', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2
    });

    if (isPrecio)
        td.next().next().text(printableTotal);
    else
        td.next().text(printableTotal);
  });
};


