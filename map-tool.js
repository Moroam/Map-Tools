function MapTool(map) {
  this._coords = null;
  this._position = null;
  this._waypoints = [];
  this._route = null;
  this._menuItems = MapTool.MenuItems;
  this._model = new MapTool.Model(map);
  this._view = new MapTool.View(this);

  this._idElement = 1;

  this.setMap(map);

  // for action map zoom
  this._map.startZoom = 0;
  this._map.startWidth = 0;
  this._map.startHeight = 0;
  this._map.defaultZoom = 17;
  this._map.maxWidth = 16000;
  this._map.maxHeight = 12000;

  this._actionList();

  this._map._contextmenuElement = null;
  this._map._contextmenuElementFlag = false;
  this._map._editSetElements = new Set();
  this._map._draggable = false;

  this._map.events.add('contextmenu', (e) => {
    if(!this._map._contextmenuElementFlag){
      this._map._contextmenuElement = null;
    }
    this._map._contextmenuElementFlag = false;
  });

}

MapTool.WAYPOINTS_LABELS = 'АБ';

MapTool.prototype = {
  constructor: MapTool,
  _attachHandlers: function () {
    this._model.events
      .add('openmenu', this._onOpenMenu, this)
      .add('closemenu', this._onCloseMenu, this)
      .add('infoloaded', this._onInfoLoaded, this)
      .add('routeloaded', this._onRouteLoaded, this);

    this._view.events
      .on('selectaction', ymaps.util.bind(this._onSelectAction, this));
  },
  _detachHandlers: function () {
    this._model.events
      .remove('openmenu', this._onOpenMenu, this)
      .remove('closemenu', this._onCloseMenu, this)
      .remove('infoloaded', this._onInfoLoaded, this)
      .remove('routeloaded', this._onRouteLoaded, this);

    this._view.events
      .off('selectaction');
  },
  _showMenuItems: function () {
    let menuItems = this._menuItems,
      contextmenuElementFlag = this._map._contextmenuElementFlag && !(this._map._contextmenuElement === null),
      editElementFlag = contextmenuElementFlag && (this._map._editSetElements.has(this._map._contextmenuElement));

    menuItems['addMarker']['show'] = !contextmenuElementFlag;
    menuItems['addPolyline']['show'] = !contextmenuElementFlag;
    menuItems['addPolygon']['show'] = !contextmenuElementFlag;

    menuItems['editProperties']['show'] = contextmenuElementFlag;
    menuItems['editElement']['show'] = contextmenuElementFlag && !editElementFlag;
    menuItems['deleteElement']['show'] = contextmenuElementFlag;

    menuItems['fixElement']['show'] = editElementFlag;
    menuItems['fixElements']['show'] = (this._map._editSetElements.size > 0) && !editElementFlag;

    menuItems['routeDelete']['show'] = !(this._route === null);

  },
  _onOpenMenu: function (e) {
    this._view.clear();
    this._showMenuItems();
    this._view.render(e.get('position'));
    this._coords = e.get('coords');
    this._position = e.get('position');
  },
  _onCloseMenu: function (e) {
    this._view.clear();
    this._map._contextmenuElement = null;
  },
  _onInfoLoaded: function (e) {
    var result = e.get('result');
    if(result) {
      this._map.balloon
        .open(this._coords /*result.geometry.getCoordinates()*/, {
          content: result.properties.get('balloonContentBody') +
            '<p>' + [this._coords[0].toPrecision(8), this._coords[1].toPrecision(8)].join(', ') + '</p>'
        });
    }
  },
  _onSelectAction: function (e) {
    this[e.action]();
    this._view.clear();
  },
  setMap: function (map) {
    if(map == this._map) {
      return;
    }

    this._detachHandlers();
    this._map = map;
    this._attachHandlers();
  },
  getInfo: function () {
    this._model.getInfo(this._coords);
  },

  addMarker: function (label = null) {
    if(!label){
      label = this._idElement++;
    }
    let obj = {
      geometry: {
        'coordinates': this._coords
      },
      properties: {
        'myID': label,
        'myText': ''
      },
      options: {}
    }
    return this._model.addMarker( obj );
  },
  addPolyline: function () {
    return this._model.addPolyline();
  },
  addPolygon: function () {
    return this._model.addPolygon();
  },

  deleteElement: function () {
    if(this._map._contextmenuElement === null){
      return;
    }

    this._map._editSetElements
      .delete(this._map._contextmenuElement);

    this._map.geoObjects
      .remove(this._map._contextmenuElement);

    this._map._contextmenuElement = null;
  },

  editElement: function () {
    let elem = this._map._contextmenuElement;
    if(elem === null){
      return;
    }

    this._map._editSetElements.add(elem);

    elem.editor.startEditing();
    if( this._map._draggable ){
      elem.options.set('draggable', true);
    }

    elem.properties.set({myIDStyle: 'style="color:red;font-weight:bold;"'});
  },
  editProperties: function () {
    this._model.editProperties( this._map._contextmenuElement, this._position );
  },
  fixElements: function () {
    if(this._map._editSetElements.size == 0){
      return;
    }

    for (let elem of this._map._editSetElements){
      elem.editor.stopEditing();
      elem.options.set('draggable', false);
      elem.properties.set({myIDStyle: ''});
    }

    this._map._editSetElements.clear();
  },
  fixElement: function () {
    let elem = this._map._contextmenuElement;
    if(elem === null){
      return;
    }

    elem.editor.stopEditing();
    elem.options.set('draggable', false);
    elem.properties.set({myIDStyle: ''});

    this._map._editSetElements.delete(elem);
  },
  routeFrom: function () {
    this._addWayPoint(0);
    this._getRoute();
  },
  routeTo: function () {
    this._addWayPoint(1);
    this._getRoute();
  },
  routeDelete: function () {
    if(this._route) {
      this._map.geoObjects
        .remove(this._route);
      this._map.geoObjects
        .remove(this._waypoints[0]);
      this._map.geoObjects
        .remove(this._waypoints[1]);
      this._waypoints = [];

      MapTool.MenuItems['routeDelete']['show'] = false;
    }
  },
  _getRoute: function () {
    var waypoints = this._waypoints,
      origin = waypoints[0] && waypoints[0].geometry.getCoordinates(),
      destination = waypoints[1] && waypoints[1].geometry.getCoordinates();

    if(origin && destination) {
      this._model.getRoute([origin, destination]);
      MapTool.MenuItems['routeDelete']['show'] = true;
    }
  },
  _addWayPoint: function (index) {
    var waypoints = this._waypoints,
      label = MapTool.WAYPOINTS_LABELS.charAt(index),
      marker = this.addMarker(label);

    if(waypoints[index]) {
      this._map.geoObjects
        .remove(waypoints[index]);
    }

    if(this._route) {
      this._map.geoObjects
        .remove(this._route);
    }

    this._map.geoObjects
      .add(waypoints[index] = marker);
  },
  _onRouteLoaded: function (e) {
    this._map.geoObjects
      .add(this._route = e.get('result'));

    this._route.options.set('preset', 'router#route');
  },
  importMapObjects: function (e) {
    let f = document.createElement('input');
    f.type = 'file';
    f.accept = 'application/json';
    f.hidden = 'true';
    f.onchange = (e) => {
      let file = e.target.files[0];
      if (!file) return;
      let reader = new FileReader();
      reader.onload = (e) => this.displayJSONContents(e.target.result);
      reader.readAsText(file);
    }

    document.body.append(f);

    f.click();
    f.remove();
  },
  displayJSONContents: function (contents) {
    let objs = JSON.parse(contents);

    for ( let obj of objs){
      if(!obj) return;

      if(obj.geometry.type == 'Map'){
        this._map.setCenter( obj.geometry.coordinates );
        this._map.setZoom( obj.geometry.zoom );
      }

      if(obj.geometry.type == 'Point'){
        this._model.addMarker( obj );
      }
      if(obj.geometry.type == 'LineString'){
        this._model.addPolyline( obj );
      }
      if(obj.geometry.type == 'Polygon'){
        this._model.addPolygon( obj );
      }
    }
  },
  exportMapObjects: function (e) {
    let i=1,
      objs = [{'id': 0,
        'geometry': {
          'type': 'Map',
          'coordinates': this._map.getCenter(),
          'zoom': this._map.getZoom()
        }
      }];


    this._map.geoObjects.each(function(item){
      if(!item) return;
      let type = item.geometry.getType(),
        obj = {
          'id': i++,
          'geometry': {
            'type': type,
            'coordinates': item.geometry.getCoordinates()
          },
          'properties': {},
          'options': {}
        };
      if(item.properties.get('balloonContent')){
        obj.properties.balloonContent = item.properties.get('balloonContent');
      }
      if(item.properties.get('hintContent')){
        obj.properties.hintContent = item.properties.get('hintContent');
      }

      if(type == 'Point'){
        obj.options.iconColor = item.options.get('iconColor');
        obj.properties.myText = '';
        obj.properties.myID = obj.id;
        if(item.properties.get('myText')){
          obj.properties.myText = item.properties.get('myText');
        }
        if(item.properties.get('myID')){
          obj.properties.myID = item.properties.get('myID');
        }
      }

      if(type == 'LineString' || type == 'Polygon'){
        obj.options.editorMaxPoints = item.options.get('editorMaxPoints');
        obj.options.strokeWidth = item.options.get('strokeWidth');
        obj.options.strokeColor = item.options.get('strokeColor');
        obj.options.strokeOpacity = item.options.get('strokeOpacity');
      }

      if(type == 'Polygon'){
        obj.options.fillColor = item.options.get('fillColor');
        obj.options.fillOpacity = item.options.get('fillOpacity');
      }

      objs.push(obj);
    });

    this._model.downloadFile('data.json', JSON.stringify(objs))
  },
  zoom: function (e){
    let myMap = this._map,
      mapZoom = myMap.getZoom();

    if( this._map.defaultZoom == mapZoom && this._map.startZoom == 0){
      return;
    }

    let mapID = myMap.container.getParentElement().id,
      map = $('#' + mapID),
      width = map.width(),
      height = map.height(),
      pow = Math.pow(2, this._map.defaultZoom - mapZoom);

    if(this._map.startZoom == 0){
      this._map.startZoom = mapZoom;
      this._map.startWidth = width;
      this._map.startHeight = height;
    }

    width = Math.min(this._map.maxWidth, pow * width);
    height = Math.min(this._map.maxHeight, pow * height);

    map.width(width).height(height);
    myMap.setZoom(this._map.defaultZoom);
    myMap.container.fitToViewport();
  },
  resetZoom: function (e){
    if(this._map.startZoom == 0){
      return;
    }

    let myMap = this._map,
      mapID = myMap.container.getParentElement().id,
      map = $('#' + mapID);

    map.width(this._map.startWidth).height(this._map.startHeight);
    myMap.setZoom(this._map.startZoom);
    myMap.container.fitToViewport();

    this._map.startZoom = 0;
    this._map.startWidth = 0;
    this._map.startHeight = 0;

  },
  _actionList: function (){
    var actionList = new ymaps.control.ListBox({
      data: {
        content: 'Действия'
      },
      items: [
        new ymaps.control.ListBoxItem({data: {content: 'Экспорт'}, options:{selectOnClick:false}}),
        new ymaps.control.ListBoxItem({data: {content: 'Импорт' }, options:{selectOnClick:false}}),
        new ymaps.control.ListBoxItem({
          data: {
            title: 'Включить/выключить перетаскивание элементов на карте при редактировании. Применяется на вновь редактируемые элементы',
            content: 'Перетаскивание'
          }
        }),
        new ymaps.control.ListBoxItem({data: {content: 'Масштабировать' }, options:{selectOnClick:false}}),
        new ymaps.control.ListBoxItem({data: {content: 'Сброс Масштаба' }, options:{selectOnClick:false}}),
      ]
    });

    actionList.get(0).events.add('click', this.exportMapObjects, this );
    actionList.get(1).events.add('click', this.importMapObjects, this );
    actionList.get(2).events.add('click', (e) => this._map._draggable = !this._map._draggable );
    actionList.get(3).events.add('click', this.zoom, this );
    actionList.get(4).events.add('click', this.resetZoom, this );

    this._map.controls.add(actionList, {float: 'left'});
  }

};

MapTool.MenuItems = {
    'getInfo': {
        'text': 'Что здесь?',
        'color': 'black',
        'show': true
    },

    'addMarker': {
        'text': 'Добавить метку',
        'color': 'blue',
        'show': true
    },
    'addPolyline': {
        'text': 'Добавить ломаную',
        'color': 'blue',
        'show': true
    },
    'addPolygon': {
        'text': 'Добавить область',
        'color': 'blue',
        'show': true
    },

    'editProperties': {
        'text': 'Параметры',
        'color': 'maroon',
        'show': false
    },
    'editElement': {
        'text': 'Изменить',
        'color': 'green',
        'show': false
    },
    'deleteElement': {
        'text': 'Удалить',
        'color': 'red',
        'show': false
    },
    'fixElements': {
        'text': 'Зафиксировать все',
        'color': 'black',
        'show': false
    },
    'fixElement': {
        'text': 'Зафиксировать',
        'color': 'black',
        'show': false
    },

    'routeTo': {
        'text': 'Проехать сюда',
        'color': 'black',
        'show': true
    },
    'routeFrom': {
        'text': 'Проехать отсюда',
        'color': 'black',
        'show': true
    },
    'routeDelete': {
        'text': 'Удалить маршрут',
        'color': 'darkred',
        'show': false
    },
};

MapTool.Model = function (map) {
  this.events = new ymaps.event.Manager();
  this.setMap(map);
};

MapTool.Model.prototype = {
  constructor: MapTool.Model,
  setMap: function (map) {
    if(map == this._map) {
      return;
    }

    this._detachHandlers();
    this._map = map;
    this._attachHandlers();
  },
  _attachHandlers: function () {
    if(this._map) {
      this._map.events
        .add('contextmenu', this._onRightClick, this)
        .add(['click', 'actiontick'], this._onMapAction, this);
    }
  },
  _detachHandlers: function () {
    if(this._map) {
      this._map.events
        .remove('contextmenu', this._onRightClick, this)
        .remove(['click', 'actiontick'], this._onMapAction, this);
    }
  },
  _onRightClick: function (e) {
    var position = e.get('position');

    this.events.fire('openmenu', {
      position: {
        left: position[0],
        top: position[1]
      },
      coords: e.get('coords')
    });
  },
  _onMapAction: function (e) {
    this.events.fire('closemenu', {});
  },
  getInfo: function (coords) {
    ymaps.geocode(coords)
      .then(
        ymaps.util.bind(this._onInfoLoaded, this)
      );
  },
  _onInfoLoaded: function (res) {
    this.events.fire('infoloaded', {
      result: res.geoObjects.get(0)
    });
  },
  getRoute: function (waypoints) {
    ymaps.route(waypoints)
      .then(
        ymaps.util.bind(this._onRouteLoaded, this)
      );
  },
  _onRouteLoaded: function (route) {
    this.events.fire('routeloaded', {
      result: route.getPaths().get(0)
      });
  },

  editProperties: function (elem, position) {
    if( !elem ){
      return;
    }

    let type = elem.geometry.getType();

    if( type == 'Point' ){
      this._editPoint(elem, position);
    } else if( type == 'LineString' ){
      this._editLineString(elem, position);
    } else if( type == 'Polygon' ){
      this._editPolygon(elem, position);
    } else {
      alert('Не известный тип объекта - ' + type);
    }

  },
  _editPoint: function( elem, position ) {
    if ($('#menu').css('display') == 'block') {
      $('#menu').remove();
      return;
    }

    var menuContent =
      '<div id="menu">\
        <ul id="menu_list">\
          <li><b>Текст:</b><br> <textarea rows=4 name="point_text" /> </li>\
          <li><b>Метка:</b> <input type="text" name="point_label" style="width:20em"/> </li>\
          <li><b>Цвет:</b> <input type="color" name="point_color" style="width:20em"> </li>\
          <li><span title="Всплывающее облако"><b>Балун:</b></span><br> <textarea rows=3 name="point_balloon" /> </li>\
          <li><span title="Всплывающая подсказка"><b>Хинт:</b></span><br> <input type="text" name="point_hint" > </li>\
        </ul>\
        <div align="center"><input type="submit" value="Сохранить" /></div>\
      </div>';

    $('body').append(menuContent);

    $('#menu').css(position);
    this.dragHTMLElement("menu");

    var point_text    = $('#menu textarea[name="point_text"]'),
        point_label   = $('#menu input[name="point_label"]'),
        point_color   = $('#menu input[name="point_color"]'),
        point_balloon = $('#menu textarea[name="point_balloon"]'),
        point_hint    = $('#menu input[name="point_hint"]');

    point_text.val(elem.properties.get('myText'));
    point_label.val(elem.properties.get('myID'));
    point_color.val(elem.options.get('iconColor'));
    point_balloon.val(elem.options.get('balloonContent'));
    point_hint.val(elem.options.get('hintContent'));

    $('#menu input[type="submit"]').click(function () {
      let txt = point_text.val(),
          len = parseInt(txt.length/4);
      if(len > 10 && len <= 20)
        len = 10;
      else if(len > 20 && len <= 45)
        len = 15;
      else if(len > 45)
        len = 20;
      elem.properties.set({
        myText: txt,
        myID: point_label.val(),
        myWidth: len + 'em',
        balloonContent: point_balloon.val(),
        hintContent: point_hint.val()
      });
      elem.options.set({
        iconColor: point_color.val()
      });

      $('#menu').remove();
    });
  },
  _editLineString: function( elem, position ) {
    if ($('#menu').css('display') == 'block') {
      $('#menu').remove();
      return;
    }

    var menuContent =
      '<div id="menu">\
        <ul id="menu_list">\
          <li><b>Максимальное количество вершин:</b> <input type="number" min="2" max="64" name="line_maxpoints" /></li>\
          <li><b>Параметры линии:</b><br>' +
            ' Цвет <input type="color" name="line_color" />' +
            ' Прозрачность <input type="number" min="0" max="100" name="line_opacity" />' +
            ' Ширина <input type="number" min="0" max="10"  name="line_width" />\
          </li>\
          <li><span title="Всплывающее облако"><b>Балун:</b></span><br> <textarea rows=3 name="line_balloon" /> </li>\
          <li><span title="Всплывающая подсказка"><b>Хинт:</b></span><br> <input type="text" name="line_hint" > </li>\
        </ul>\
        <div align="center"><input type="submit" value="Сохранить" /></div>\
      </div>';

    $('body').append(menuContent);

    $('#menu').css(position);
    this.dragHTMLElement("menu");

    var line_width     = $('#menu input[name="line_width"]'),
        line_color     = $('#menu input[name="line_color"]'),
        line_opacity   = $('#menu input[name="line_opacity"]'),
        line_maxpoints = $('#menu input[name="line_maxpoints"]'),
        line_balloon   = $('#menu textarea[name="line_balloon"]'),
        line_hint      = $('#menu input[name="line_hint"]');

    line_maxpoints.val(elem.options.get('editorMaxPoints'));
    line_width.val(elem.options.get('strokeWidth'));
    line_color.val(elem.options.get('strokeColor'));
    line_opacity.val(+elem.options.get('strokeOpacity') * 100);
    line_balloon.val(elem.properties.get('balloonContent'));
    line_hint.val(elem.properties.get('hintContent'));

    $('#menu input[type="submit"]').click(function () {
      elem.properties.set({
        balloonContent: line_balloon.val(),
        hintContent: line_hint.val()
      });
      elem.options.set({
        strokeWidth: line_width.val(),
        editorMaxPoints: line_maxpoints.val(),
        strokeColor: line_color.val(),
        strokeOpacity: line_opacity.val()/100
      });

      $('#menu').remove();
    });
  },
  _editPolygon: function ( elem, position ) {
    if ($('#menu').css('display') == 'block') {
      $('#menu').remove();
      return;
    }

    var menuContent =
      '<div id="menu">\
        <ul id="menu_list">\
          <li><b>Максимальное количество вершин:</b> <input type="number" min="3" max="32" name="polygon_maxpoints" /></li>\
          <li><b>Параметры границы:</b><br>' +
            ' Цвет <input type="color" name="polygon_line_color" />' +
            ' Прозрачность <input type="number" min="0" max="99" name="polygon_line_opacity" />' +
            ' Ширина <input type="number" min="0" max="10"  name="polygon_line_width" />\
          </li>\
          <li><b>Заливка:</b><br>' +
            ' Цвет <input type="color" name="polygon_fill_color">' +
            ' Прозрачность <input type="number" min="0" max="99" name="polygon_fill_opacity" />\
          </li>\
          <li><span title="Всплывающее облако"><b>Балун:</b></span><br> <textarea rows=3 name="polygon_balloon" /> </li>\
          <li><span title="Всплывающая подсказка"><b>Хинт:</b></span><br> <input type="text" name="polygon_hint" > </li>\
        </ul>\
        <div align="center"><input type="submit" value="Сохранить" /></div>\
      </div>';

    $('body').append(menuContent);

    $('#menu').css(position);
    this.dragHTMLElement("menu");

    var polygon_maxpoints    = $('#menu input[name="polygon_maxpoints"]'),
        polygon_line_width   = $('#menu input[name="polygon_line_width"]'),
        polygon_line_color   = $('#menu input[name="polygon_line_color"]'),
        polygon_line_opacity = $('#menu input[name="polygon_line_opacity"]'),
        polygon_fill_color   = $('#menu input[name="polygon_fill_color"]'),
        polygon_fill_opacity = $('#menu input[name="polygon_fill_opacity"]'),
        polygon_balloon      = $('#menu textarea[name="polygon_balloon"]'),
        polygon_hint         = $('#menu input[name="polygon_hint"]');

    polygon_maxpoints.val( elem.options.get('editorMaxPoints'));
    polygon_line_width.val(elem.options.get('strokeWidth'));
    polygon_line_color.val(elem.options.get('strokeColor'));
    polygon_line_opacity.val(+elem.options.get('strokeOpacity') * 100);
    polygon_fill_color.val(elem.options.get('fillColor'));
    polygon_fill_opacity.val(+elem.options.get('fillOpacity') * 100);
    polygon_balloon.val(elem.properties.get('balloonContent'));
    polygon_hint.val(elem.properties.get('hintContent'));

    $('#menu input[type="submit"]').click(function () {
      elem.properties.set({
        balloonContent: polygon_balloon.val(),
        hintContent: polygon_hint.val()
      });
      elem.options.set({
        strokeWidth: polygon_line_width.val(),
        editorMaxPoints: polygon_maxpoints.val(),
        strokeColor: polygon_line_color.val(),
        strokeOpacity: polygon_line_opacity.val() / 100,
        fillColor: polygon_fill_color.val(),
        fillOpacity: polygon_fill_opacity.val() / 100
      });

      $('#menu').remove();
    });
  },
  addMarker: function ( obj ) {
    var style = 'style="position:absolute;bottom:0;font-size:.9em;width:$[properties.myWidth];left:1.75em;text-align:left;background-color:RGBA(255,255,255,0.5);"';
    var marker = new ymaps.Placemark(obj.geometry.coordinates, obj.properties, obj.options);
    marker.properties.myWidth = 0;
    marker.properties.myIDStyle = '';
    marker.options.set('iconContentLayout', ymaps.templateLayoutFactory.createClass(
      '<div style="position:relative;"><div $[properties.myIDStyle]>$[properties.myID]</div>' +
      '<div ' + style + '>$[properties.myText]</div></div>'
    ) );

    marker.events.add('contextmenu', (e)=> {
      this._map._contextmenuElementFlag = true;
      this._map._contextmenuElement = marker;
    });

    this._map.geoObjects
      .add(marker);

    return marker;
  },
  addPolyline: function (obj = null) {
    let editFlag = (obj === null);
    if(editFlag){
      obj = {
        geometry: {
          'coordinates': []
        },
        properties: {},
        options: {
          strokeColor: "#000000",
          strokeOpacity: 0.5,
          strokeWidth: 4,
          editorMaxPoints: 8
        }
      }
    }

    var self = this;
    var myPolyline = new ymaps.Polyline(obj.geometry.coordinates, obj.properties, obj.options);
    myPolyline.options.set('zIndex', 20);
    myPolyline.options.set('editorDrawingCursor', 'crosshair');
    myPolyline.options.set('editorMenuManager', function (items) {
      items.push({
        title: "Удалить линию",
        onClick: function () {
          myMap.geoObjects.remove(myPolyline);
        }
      },{
        title: "Завершить редактирование",
        onClick: function () {
          myPolyline.editor.stopEditing();
          self._map._editSetElements.delete(myPolyline);
        }
      });
      return items;
    });
    myPolyline.events.add('contextmenu', (e)=> {
      this._map._contextmenuElementFlag = true;
      this._map._contextmenuElement = myPolyline;
    });

    this._map.geoObjects
      .add(myPolyline);

    if(editFlag){
      myPolyline.editor.startEditing();
      myPolyline.editor.startDrawing();
      this._map._editSetElements.add(myPolyline);
    }


    return myPolyline;
  },
  addPolygon: function (obj = null) {
    let editFlag = (obj === null);
    if(editFlag){
      obj = {
        geometry: {
          'coordinates': []
        },
        properties: {},
        options: {
          strokeColor: "#0000FF",
          strokeOpacity: 0.8,
          strokeWidth: 2,
          editorMaxPoints: 5,
          fillColor: '#00FF00',
          fillOpacity: 0.5
        }
      }
    }

    var self = this;
    var myPolygon = new ymaps.Polygon(obj.geometry.coordinates, obj.properties, obj.options);
    myPolygon.options.set('zIndex', 10);
    myPolygon.options.set('editorDrawingCursor', 'crosshair');
    myPolygon.options.set('editorMenuManager', function (items) {
      items.push({
        title: "Удалить линию",
        onClick: function () {
          myMap.geoObjects.remove(myPolygon);
        }
      },{
        title: "Завершить редактирование",
        onClick: function () {
          myPolygon.editor.stopEditing();
          self._map._editSetElements.delete(myPolygon);
        }
      });
      return items;
    });

    myPolygon.events.add('contextmenu', (e)=> {
      this._map._contextmenuElementFlag = true;
      this._map._contextmenuElement = myPolygon;
    });

    this._map.geoObjects
      .add(myPolygon);

    if(editFlag){
      myPolygon.editor.startEditing();
      myPolygon.editor.startDrawing();
      this._map._editSetElements.add(myPolygon);
    }

    return myPolygon;
  },
  downloadFile: function( filename, text ) {
    var el = document.createElement("a");
    el.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
    el.setAttribute("download", filename);
    el.style.display = "none";
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
  },
  dragHTMLElement: function( elem ) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if(typeof elem !== 'object'){
      elem = document.getElementById(elem);
    }

    elem.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e = e || window.event;
      pos3 = e.clientX;
      pos4 = e.clientY;
      elem.style.cursor='move';
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e = e || window.event;
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      elem.style.top = (elem.offsetTop - pos2) + "px";
      elem.style.left = (elem.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
      elem.style.cursor='default';
      document.onmouseup = null;
      document.onmousemove = null;
    }
  },
};

MapTool.View = function (parent) {
    let menuItems = this.menuItems,
        menu = '<div class="dropdown clearfix"><ul class="dropdown-menu">';
    for(key in menuItems) {
        menu += '<li><a data-action="' + key + '" href="#" style="color: ' + menuItems[key]['color'] + '" >' + menuItems[key]['text'] + '</a></li>';
    }
    menu += '</ul></div>';
    this._menu = $(menu);

    this._parent = parent;
    this.events = $({});
    this._container = $('body');
};

MapTool.View.prototype = {
    constructor: MapTool.View,
    menuItems: MapTool.MenuItems,
    render: function (position) {
        this._menu
            .css(position)
            .appendTo(this._container);

        this._showElements();
        this._attachHandlers();
    },
    clear: function () {
        this._detachHandlers();
        this._menu.remove();
    },
    _showElements: function() {
        let menuItems = this.menuItems;
        for(key in menuItems) {
            if(menuItems[key]['show']){
                $('a[data-action="' + key + '"]').parent().show()
            } else {
                $('a[data-action="' + key + '"]').parent().hide()
            }
        }
    },
    _attachHandlers: function () {
        this._menu
            .on('click', 'a', $.proxy(this._onSelectAction, this));
    },
    _detachHandlers: function () {
        this._menu
            .off('click', 'a');
    },
    _onSelectAction: function (e) {
        e.preventDefault();

        this.events.trigger($.Event('selectaction', {
            action: $(e.target).attr('data-action')
        }));
    }
};

