/**
 * круги бывают людьми и компаниями (там на самом деле целый ряд комбинаций, но это особо не влияет на схематику)
 *
 * связи бывают двух типов
 * - учредители (зеленые)
 * - руководительские (синие)
 *
 * все связи имеют направление
 *
 * объекты и графы можно выделять кликом или кликом+драг
 * у объектов и связей бывают три состояния - выделенное, неактивное, активное
 *
 * */

// 20 * 20


/*

 [+] + prepare entities for placing (autolayout)
 [+] placing it
 [-] draw connects

 [+] drag ents
 [-] drag connects
 */

var $graph = document.querySelector('#graph');


/* CONFIG */
!function () {
  var width = $graph.offsetWidth,
      height = $graph.offsetHeight;

  window.config = {
    container: {
      width: width,
      height: height
    },
    center_coords: {
      x: _.round(width / 2),
      y: _.round(height / 2),
    },
    entity: {
      radius: 30,
      gutter: 20 * 3,
    }
  };
}();

/* INPUT */
!function () {
  window.input = {
    entities: [
      { // принимаем первую за исходную
        id: 1,
        label: 'first'
      },
      {
        id: 2,
        label: 'second'
      },
      {
        id: 3,
        label: 'third'
      }
    ],
    connections: [
      {
        id: 1,
        from: 1,
        to: 2,
        label: 'connect label'
      },
      {
        id: 2,
        from: 1,
        to: 3,
        label: 'connect label'
      }
    ]
  }
}();


function prepareInputData(raw, cfg) {
  var connections = raw.connections,
      entities = raw.entities,
      _getContainerCoords = _.partialRight(getContainerCoords, cfg.center_coords);

  entities = entities.map(function (entity, index, list) {
    var relativeCoords = (index !== 0)
        ? getCoordsForEntity(cfg.entity.radius, cfg.entity.gutter, index)
        : {x: 0, y: 0};

    return _.assign({}, entity, {
      coords: _getContainerCoords(relativeCoords)
    });
  });

  return {
    entities: entities,
    connections: connections
  }
}


(function (input, config) {
  var data = prepareInputData(input, config),
      entities = data.entities,
      connections = data.connections;

  // Create svg
  var svg = d3.select($graph).append('svg').attr(config.container);

  function render(entities, connections) {
    /** RENDER: ENTITIES */
    var d3Entities = (function () {
      // connect data
      var selection = svg.selectAll('g.entity')
          .data(entities);

      // ENTITIES CREATE
      !function () {
        var newElements = selection.enter().append('svg:g').classed({
          'entity': true
        }).attr({
          fill: 'black',
          transform: function (datum, index) {
            return "translate(" + [datum.coords.x, datum.coords.y] + ")"
          }
        });

        newElements.append('svg:circle')
            .attr({
              opacity: .4,
              r: config.entity.radius
            })
            .classed({
              'entity__circle': true
            });

        newElements.append('svg:text')
            .attr({
              'text-anchor': 'middle',
              fill: 'white',
              y: 4,
            })
            .text(function(datum){
              return datum.label
            })


        return newElements
      }();

      // ENTITIES UPDATE
      !function () {
        // update position
        selection.attr({
          transform: function (datum, index) {
            return "translate(" + [datum.coords.x, datum.coords.y] + ")"
          }
        });

        // update entities face
        selection.classed({
          'entity_draggable': function (datum) {
            return datum.is_draggable
          },
          'entity_selected': function (datum) {
            return datum.is_selected
          }
        }).attr({
          fill: function (datum) {
            return datum.is_draggable ? 'red' : 'black'
          }
        })
      }();

      // ENTITIES DELETE
      !function () {
        selection.exit().remove();
      }();

      return selection
    })();

    /** RENDER: CONNECTIONS */
    !function () {
      var lineCoordsGetter = {
        x1: function (datum, index) {
          return datum.from.x
        },
        y1: function (datum, index) {
          return datum.from.y
        },
        x2: function (datum, index) {
          return datum.to.x
        },
        y2: function (datum, index) {
          return datum.to.y
        },
      };

      var selection = svg.selectAll('g.connection')
          .data(connections.map(function (connection, index, list) {
            return {
              from: _.findWhere(entities, {'id': connection.from}).coords,
              to: _.findWhere(entities, {'id': connection.to}).coords,
              label: connection.label
            }
          }));

      // CONNECTIONS CREATE
      var newElements = selection.enter().append('svg:g')
          .classed({
            'connection': true
          })
          .style({
            stroke: "black",
            'marker-end': function (datum, index) {
              return 'url(#end-arrow-' + datum.id + ')'
            }
          });

      newElements.append('line')
          .attr(lineCoordsGetter);

      newElements.append('svg:defs').append('svg:marker')
          .attr({
            id: function (datum, index) {
              return 'end-arrow-' + datum.id
            },
            'orient': 'auto',
            'viewBox': '0 -5 10 10',
            'refX': 3,
            'markerWidth': 8,
            'markerHeight': 8,
          })
          .append('svg:path')
          .attr({
            'd': 'M0,-5L10,0L0,5',
            'fill': '#000'
          });

      // CONNECTIONS UPDATE
      selection.select('line').attr(lineCoordsGetter);

      // CONNECTIONS DELETE
      selection.exit().remove();
    }();

    return d3Entities;
  }

  // INITIAL RENDER
  var d3Entities = render(entities, connections);

  // BIND EVENTS
  var dragDispatcher = d3.behavior.drag();
  d3Entities.call(
      dragDispatcher
          .on('dragstart', function (datum, index) {
            datum.is_draggable = true;
            datum.is_selected = true;
            render(entities, connections)
          })
          .on('dragend', function (datum, index) {
            datum.is_draggable = false;
            datum.is_selected = false;
            render(entities, connections)
          })
          .on('drag', function (datum, index) {
            // write new position
            datum.coords = {
              x: datum.coords.x + d3.event.dx,
              y: datum.coords.y + d3.event.dy
            };
            render(entities, connections)
          })
  )

  /*
   svg.append('svg:defs').append('svg:marker')
   .attr('id', 'start-arrow')
   .attr('viewBox', '0 -5 10 10')
   .attr('refX', 4)
   .attr('markerWidth', 8)
   .attr('markerHeight', 8)
   .attr('orient', 'auto')
   .append('svg:path')
   .attr('d', 'M10,-5L0,0L10,5')
   .attr('fill', '#000')
   ;*/

  /*// line displayed when dragging new nodes
   var drag_line = svg.append('svg:path')
   .attr('class', 'dragline hidden')
   .attr('d', 'M0,0L0,0')
   ;*/

})(window.input, window.config);


function getCoordsForEntity(radius, gutter, depth) {
  return {
    x: 0,
    y: (radius + (gutter * (depth + 1))) * -1
  }
}

function getContainerCoords(coords, center_coords) {
  return {
    x: center_coords.x + coords.x,
    y: center_coords.y + coords.y
  }
}

function getConnectedEntities(id, entities, connections) {
  return {
    from: [],
    to: []
  }
}
