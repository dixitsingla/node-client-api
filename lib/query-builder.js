/*
 * Copyright 2014 MarkLogic Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var deepcopy = require('deepcopy');
var valcheck = require('core-util-is');
var mlutil = require('./mlutil.js');

var comparisons = {
    '<'  : 'LT',
    '<=' : 'LE',
    '>'  : 'GT',
    '>=' : 'GE',
    '='  : 'EQ',
    '!=' : 'NE'
};
var datatypes = {
    'xs:anyURI':            'xs:anyURI',
    'xs:date':              'xs:date',
    'xs:dateTime':          'xs:dateTime',
    'xs:dayTimeDuration':   'xs:dayTimeDuration',
    'xs:decimal':           'xs:decimal',
    'xs:double':            'xs:double',
    'xs:float':             'xs:float',
    'xs:gDay':              'xs:gDay',
    'xs:gMonth':            'xs:gMonth',
    'xs:gMonthDay':         'xs:gMonthDay',
    'xs:gYear':             'xs:gYear',
    'xs:gYearMonth':        'xs:gYearMonth',
    'xs:int':               'xs:int',
    'xs:long':              'xs:long',
    'xs:string':            'xs:string',
    'xs:time':              'xs:time',
    'xs:unsignedInt':       'xs:unsignedInt',
    'xs:unsignedLong':      'xs:unsignedLong',
    'xs:yearMonthDuration': 'xs:yearMonthDuration'
};
/** @ignore */
function asIndex(index) {
  return valcheck.isString(index) ? property(index) : index;
}
/** @ignore */
function addIndex(query, index, isContainer) {
  var containerOnly = isContainer || false;
  if (index['json-property'] !== undefined) {
    query['json-property'] = index['json-property'];
  } else if (index.element !== undefined) {
    query.element = index.element;
    if (index.attribute !== undefined) {
      query.attribute = attribute;
    }
  } else if (containerOnly) {
  } else if (index.field !== undefined) {
    query.field = index.field;
  } else if (index['path-index'] !== undefined) {
    query['path-index'] = index['path-index'];
  }
}

/**
 * A helper for building the definition of a document query. The helper is
 * created by the {@link module:marklogic.queryBuilder} function. 
 * @namespace queryBuilder
 */

/**
 * A composable query.
 * @typedef {object} queryBuilder.Query
 */
/**
 * An indexed name such as a JSON property, element, attribute, field,
 * or path index.
 * @typedef {object} queryBuilder.IndexedName
 */

/**
 * Builds a query for the intersection of the subqueries.
 * @method
 * @memberof queryBuilder#
 * @param {...queryBuilder.Query} subquery - a word, value, range, geospatial,
 * or other query or a composer such as an or query.
 * @param {queryBuilder.OrderParam} [ordering] - the ordering on the subqueries
 * returned from {@link queryBuilder#ordered}
 * @returns {queryBuilder.Query} a composable query
 */
function and() {
  var args = mlutil.asArray.apply(null, arguments);
  var query = {
    queries: []
  };
  var seekingOrdered = true;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (seekingOrdered && arg.ordered !== null && arg.ordered !== undefined) {
      query.ordered = arg.ordered;
      seekingOrdered = false;
    } else if (arg instanceof Array){
      Array.prototype.push.apply(query.queries, arg);
    } else if (seekingOrdered && valcheck.isBoolean(arg)) {
      query.ordered = arg;
      seekingOrdered = false;
    } else {
      query.queries.push(arg);
    }
  }
  return {'and-query': query};
}
/**
 * Builds a query with positive and negative subqueries.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.Query} positiveQuery - a query that must match
 * the result documents
 * @param {queryBuilder.Query} negativeQuery - a query that must not match
 * the result documents
 * @returns {queryBuilder.Query} a composable query
 */
function andNot() {
  var args = mlutil.asArray.apply(null, arguments);
  switch(args.length) {
  case 0:
    throw new Error('missing positive and negative queries: '+args);
  case 1:
    throw new Error('missing negative query: '+args);
  default:
    return {'and-not-query':{
      'positive-query': args[0],
      'negative-query': args[1]
    }};
  }
}
/**
 * Specifies an attribute for a query.  A name without a namespace can be
 * expressed as a string.  A namespaced name can be expressed as a two-item
 * array with uri and name strings or as an object returned by the 
 * {@link queryBuilder#qname} function.
 * @method
 * @memberof queryBuilder#
 * @param {string|string[]|queryBuilder.QName} element - the name of the element
 * @param {string|string[]|queryBuilder.QName} attribute - the name of the attribute
 * @returns {queryBuilder.IndexedName} an indexed name for specifying a query
 */
function attribute() {
  var args = mlutil.asArray.apply(null, arguments);
  switch(args.length) {
  case 0:
    throw new Error('missing element and attribute: '+args);
  case 1:
    throw new Error('missing attribute: '+args);
  case 2:
    return {
      element:   (!valcheck.isUndefined(args[0].qname)) ?
          args[0].qname : nsName.call(null, args[0]),
      attribute: (!valcheck.isUndefined(args[1].qname)) ?
          args[1].qname : nsName.call(null, args[1])
      };
  case 3:
    if (!valcheck.isUndefined(args[0].qname))
      return {
        element: args[0].qname,
        attribute:{ns: args[1], name: args[2]}
      };
    if (!valcheck.isUndefined(args[2].qname))
      return {
        element:{ns: args[0], name: args[1]},
        attribute: args[2].qname
      };
    if (valcheck.isArray(args[0]))
      return {
        element: nsName.call(null, args[0]),
        attribute:{ns: args[1], name: args[2]}
      };
    return {
      element:{ns: args[0], name: args[1]},
      attribute: nsName.call(null, args[2])
      };
  default:
    return {
      element:{ns: args[0], name: args[1]},
      attribute:{ns: args[2], name: args[3]}
      };
 }
}
/**
 * Builds a query with matching and boosting subqueries.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.Query} matchingQuery - a query that must match
 * the result documents
 * @param {queryBuilder.Query} boostingQuery - a query that increases
 * the ranking when qualifying result documents
 * @returns {queryBuilder.Query} a composable query
 */
function boost() {
  var args = mlutil.asArray.apply(null, arguments);
  switch(args.length) {
  case 0:
    throw new Error('missing matching and boosting queries: '+args);
  case 1:
    throw new Error('missing boosting query: '+args);
  default:
    return {'boost-query':{
      'matching-query': args[0],
      'boosting-query': args[1]
    }};
  }
}
function box() {
  var args = mlutil.asArray.apply(null, arguments);
  var region = null;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    switch(i) {
    case 0:
      if (arg.south && arg.west && arg.north && arg.east) {
        region = arg;
      } else {
        region = {south: arg};
      }
      break;
    case 1:
      region.west = arg;
      break;
    case 2:
      region.north = arg;
      break;
    case 3:
      region.east = arg;
      break;
    default:
      throw new Error('unsupported parameter: '+arg);
    }
  }
  return {box: region};
}
function circle() {
  var args = mlutil.asArray.apply(null, arguments);
  var query = {};
  var seekingRadius    = true;
  var seekingLatitude  = true;
  var seekingLongitude = true;
  var point = null;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (seekingRadius && valcheck.isNumber(arg)) {
      query.radius = arg;
      seekingRadius = false;
    } else if (seekingLatitude && arg.point) {
      query.point = arg.point;
      seekingLatitude  = false;
      seekingLongitude = false;
    } else if (seekingLatitude && arg.latitude && arg.longitude) {
      query.point = [arg];
      seekingLatitude  = false;
      seekingLongitude = false;
    } else if (seekingLatitude && arg instanceof Array && arg.length === 2) {
      query.point = [{latitude: arg[0], longitude: arg[1]}];
      seekingLatitude  = false;
      seekingLongitude = false;
    } else if (seekingLatitude && valcheck.isNumber(arg)) {
      point = {latitude: arg};
      seekingLatitude = false;
    } else if (seekingLongitude && valcheck.isNumber(arg)) {
      point.longitude = arg;
      seekingLongitude = false;
    } else {
      throw new Error('unsupported parameter: '+arg);
    }
  }
  if (point !== null && point.latitude && point.longitude) {
    query.point = [point];
  } else if (seekingLatitude || seekingLongitude) {
    throw new Error('failed to discover latitude and longitude: '+args);
  }
  return {circle: query};
}
/**
 * Builds a query matching documents in one or more collections.  The
 * collections can be specified as arguments or parsed from a query
 * string based on a binding.
 * @method
 * @memberof queryBuilder#
 * @param {string|string[]|queryBuilder.BindingParam} collections - either
 * one or more collection uris to match or exactly one binding (returned
 * by the {@link queryBuilder#bind} function) for parsing the collection
 * uris from a query string 
 * @param {string} [prefix] - a prefix to prepend to each value provided by
 * the parsed query string; can be provided only when providing a binding
 * @returns {queryBuilder.Query} a composable query
 */
function collection() {
  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  if (argLen === 0) {
    return {collection: null};
  }
  if (argLen <= 2) {
    for (var i=0; i < argLen; i++) {
      var arg = args[i];
      var constraintName = arg.constraintName;
      if (!valcheck.isUndefined(constraintName)) {
        var qualifier = {};
        if (argLen === 2) {
          var prefix = args[(i + 1) % 2];
          if (!valcheck.isUndefined(prefix)) {
            qualifier.prefix = prefix;
          }
        }
        return {
          name: constraintName,
          collection: qualifier
        };
      }
    }
  }
  return {'collection-query': {
    uri: args
  }};
}
/**
 * Builds a query naming a JSON property or XML element that must contain
 * the matches for a subquery (which may be a composer query such as those
 * returned by the {@link queryBuilder#and} and {@link queryBuilder#or}).
 * @method
 * @memberof queryBuilder#
 * @param {string|queryBuilder.IndexedName} propertyOrElement - the JSON 
 * property or XML element that contains the query matches; a string is
 * treated as a JSON property
 * @param {queryBuilder.Query|queryBuilder.BindingParam} query - either the
 * query that must match within the scope of the JSON property or XML element
 * or a binding (returned by the {@link queryBuilder#bind} function) for
 * parsing the subquery from a query string
 * @param {queryBuilder.Query} matchingQuery - a query that must match
 * the result documents
 * @param {queryBuilder.FragmentScopeParam} [fragmentScope] - whether the query
 * applies to document content (the default) or document metadata properties
 * as returned by the {@link queryBuilder#fragmentScope} function
 * @returns {queryBuilder.Query} a composable query
 */
function scope() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length < 1) {
    throw new Error('element or property scope not specified: '+args);
  }
  var constraintIndex = null;
  var constraint = {};
  var constraintName;
  var hasQuery = false;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (i === 0) {
      constraintIndex = asIndex(arg);
      addIndex(constraint, constraintIndex, true);
      continue;
    }
    if (fragmentScope === undefined) {
      var fragmentScope = arg['fragment-scope'];
      if (fragmentScope !== undefined) {
        constraint['fragment-scope'] = fragmentScope;
        continue;
      }
    }
    if (constraintName === undefined) {
      constraintName = arg.constraintName;
      if (constraintName !== undefined) {
        continue;
      }
    }
    if (hasQuery) {
      continue;
    }
    hasQuery = true;
    var queryKeys = Object.keys(arg);
    for (var j=0; j < queryKeys.length; j++) {
      var queryKey = queryKeys[j];
      constraint[queryKey] = arg[queryKey];
    }
  }

  var wrapper = {};
  if (hasQuery) {
    if (constraintName === undefined) {
      wrapper['container-query'] = constraint;
    } else {
      throw new Error('scope has both binding and query: '+args);
    }
  } else {
    if (constraintName === undefined) {
      constraintName = defaultConstraintName(constraintIndex);
      if (constraintName === null) {
        throw new Error('could not default constraint name from '+
            Object.keys(constraintIndex).join(', ') + ' index'
            );
      }
    }
    wrapper.name = constraintName;
    wrapper.container = constraint;
  }

  return wrapper;
}
/**
 * The datatype specification returned by the {@link queryBuilder#datatype}
 * function.
 * @typedef {object} queryBuilder.DatatypeParam
 */
/**
 * Identifies the datatype of an index.
 * @method
 * @memberof queryBuilder#
 * @param {string} datatype - a value from the enumeration
 * int|unsignedInt|long|unsignedLong|float|double|decimal|dateTime|time|date|gYearMonth|gYear|gMonth|gDay|yearMonthDuration|dayTimeDuration|string|anyURI|point
 * @param {string} [collation] - a URI identifying the comparison method for a string or anyURI datatype
 * @returns {queryBuilder.DatatypeParam} a datatype specification
 */
function datatype() {
  var args = mlutil.asArray.apply(null, arguments);
  switch(args.length) {
  case 0:
    throw new Error('missing datatype: '+args);
  case 1:
    return {datatype: args[0].match(/^xs:/) ? args[0] : 'xs:'+args[0]};
  default:
    return {datatype: args[0].match(/^xs:/) ? args[0] : 'xs:'+args[0],
        'collation': args[1]};
  }
}
/**
 * Builds a query matching documents in one or more database directories.
 * @method
 * @memberof queryBuilder#
 * @param {string|string[]} uris - one or more directory uris
 * to match 
 * @param {boolean} [infinite] - whether to match documents at the top level or
 * at any level of depth within the specified directories
 * @returns {queryBuilder.Query} a composable query
 */
function directory() {
  var args = mlutil.asArray.apply(null, arguments);
  var query = {
      uri: []
  };
  var seekingInfinite = true;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (seekingInfinite && valcheck.isBoolean(arg)) {
      query.infinite = arg;
      seekingInfinite = false;
    } else if (arg instanceof Array){
      Array.prototype.push.apply(query.uri, arg);
    } else {
      query.uri.push(arg);
    }
  }
  return {'directory-query': query};
}
/**
 * Builds a query matching documents.
 * @method
 * @memberof queryBuilder#
 * @param {string|string[]} uris - one or more document uris
 * to match 
 * @returns {queryBuilder.Query} a composable query
 */
function document() {
  return {'document-query':{
    uri: mlutil.asArray.apply(null, arguments)
  }};
}
/**
 * Builds a query that applies the subquery to document content by contrast
 * with the {@link queryBuilder#properties} function.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.Query} query - the query that must match document content
 * @returns {queryBuilder.Query} a composable query
 */
function documentFragment() {  
  return {'document-fragment-query': mlutil.first.apply(null, arguments)};
}
/**
 * Specifies an element for a query.  A name without a namespace can be
 * expressed as a string.  A namespaced name can be expressed as a two-item
 * array with uri and name strings or as an object returned by the 
 * {@link queryBuilder#qname} function.
 * @method
 * @memberof queryBuilder#
 * @param {string|string[]|queryBuilder.QName} name - the name of the element
 * @returns {queryBuilder.IndexedName} an indexed name for specifying a query
 */
function element() {
  var args = mlutil.asArray.apply(null, arguments);
  switch(args.length) {
  case 0:
    throw new Error('missing element: '+args);
  case 1:
    return {
      element: (!valcheck.isUndefined(args[0].qname)) ?
          args[0].qname : nsName.call(null, args[0])
    };
  default:
    return {element:{ns: args[0], name: args[1]}};
 }
}
/**
 * Specifies a field for a query.
 * @method
 * @memberof queryBuilder#
 * @param {string} name - the name of the field
 * @returns {queryBuilder.IndexedName} an indexed name for specifying a query
 */
function field() {
  return {field: mlutil.first.apply(null, arguments)};
}
/**
 * A query argument specifying whether queries match documents based on
 * document content or document metadata properties; returned
 * by the {@link queryBuilder#fragmentScope} function.
 * @typedef {object} queryBuilder.FragmentScopeParam
 */
/**
 * Configures a query to match documents based on document content or
 * document metadata properties.
 * @method
 * @memberof queryBuilder#
 * @param {string} scopeType - a value from the documents|properties
 * enumeration where 'documents' queries document content and
 * 'properties' queries document metadata properties
 * @returns {queryBuilder.FragmentScopeParam} a fragment scope specification 
 */
function fragmentScope() {
  var scope = mlutil.first.apply(null, arguments);
  if (scope === 'documents' || scope === 'properties') {
    return {'fragment-scope': scope};
  }
  throw new Error('unknown argument: '+scope);
}
function geoAttributePair() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length < 3)
    throw new Error('not enough parameters: '+args);
  var query = {};
  var keys = ['parent', 'lat', 'lon'];
  var iArg=0;
  for (var i=0; i < keys.length; i++) {
    var key = keys[i];
    var arg = args[iArg++];
    if (arg.qname) {
      query[key] = arg.qname;
    } else if (valcheck.isString(arg)) {
      query[key] = nsName.call(null, arg);
    } else if (arg.element) {
      if (key === 'parent' || !query.parent) {
        query.parent = arg.element;
      }
      if (arg.attribute) {
        if (key === 'parent') {
          i++;
        }
        query[keys[i]] = arg.attribute;
      }
    } else {
      throw new Error('no parameter for '+key+': '+JSON.stringify(arg));
    }
  }
  return geoQuery('geo-attr-pair', args, query, iArg);
}
function geoElement() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length < 2)
    throw new Error('not enough parameters: '+args);
  var query = {};
  var keys = ['parent', 'element'];
  for (var i=0; i < keys.length; i++) {
    var key = keys[i];
    var arg = args[i];
    if (arg.qname) {
      query[key] = arg.qname;
    } else if (valcheck.isString(arg)) {
      query[key] = nsName.call(null, arg);
    } else if (arg.element) {
      query[key] = arg.element;
    } else {
      throw new Error('no parameter for '+key+': '+JSON.stringify(arg));
    }
  }
  return geoQuery('geo-elem', args, query, 2);
}
function geoElementPair() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length < 3)
    throw new Error('not enough parameters: '+args);
  var query = {};
  var keys = ['parent', 'lat', 'lon'];
  for (var i=0; i < keys.length; i++) {
    var key = keys[i];
    var arg = args[i];
    if (arg.qname) {
      query[key] = arg.qname;
    } else if (valcheck.isString(arg)) {
      query[key] = nsName.call(null, arg);
    } else if (arg.element) {
      query[key] = arg.element;
    } else {
      throw new Error('no parameter for '+key+': '+JSON.stringify(arg));
    }
  }
  return geoQuery('geo-elem-pair', args, query, 3);
}
function geoPath() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length < 1)
    throw new Error('not enough parameters: '+args);
  var query = {};
  var arg = args[0];
  if (arg['path-index']) {
    query['path-index'] = arg['path-index'];
  } else if (arg instanceof Array && arg.length === 2 && valcheck.isString(arg[0])) {
    query['path-index'] = {text: arg[0], namespaces: arg[1]};
  } else if (valcheck.isString(arg)) {
    query['path-index'] = {text: arg};
  }
  return geoQuery('geo-path', args, query, 1);
}
function geoQuery(variant, args, query, next) {
  var seekingFragmentScope = true;
  var seekingGeoOption = true;
  var seekingRegion = true;
  var seekingHeatmap = true;
  var constraintName;
  for (var i=next; i < args.length; i++) {
    var arg = args[i];
    if (seekingGeoOption && arg['geo-option']) {
      query['geo-option'] = arg['geo-option'];
      seekingGeoOption = false;
    } else if (seekingFragmentScope && arg['fragment-scope']) {
      query['fragment-scope'] = arg['fragment-scope'];
      seekingFragmentScope = false;
    } else if (seekingHeatmap && arg.heatmap) {
      query.heatmap = arg.heatmap;
      seekingHeatmap = false;
    } else if (constraintName !== undefined) {
      continue;
    } else if (seekingRegion && arg.box) {
      query.box = arg.box;
      seekingRegion = false;
    } else if (seekingRegion && arg.circle) {
      query.circle = arg.circle;
      seekingRegion = false;
    } else if (seekingRegion && arg.point) {
      query.point = arg.point;
      seekingRegion = false;
    } else if (seekingRegion && arg.latitude && arg.longitude) {
      query.point = [arg];
      seekingRegion = false;
    } else if (seekingRegion && arg.polygon) {
      query.polygon = arg.polygon;
      seekingRegion = false;
    } else if (seekingRegion && arg instanceof Array && arg.length === 2) {
      query.point = [latlon.call(null, arg)];
    } else {
      if (constraintName === undefined) {
        constraintName = arg.constraintName;
        if (constraintName !== undefined) {
          continue;
        }
      }
      throw new Error('unknown parameter: '+arg);
    }
  }

  var wrapper = {};
  if (constraintName === undefined) {
    wrapper[variant+'-query'] = query;
  } else {
    wrapper.name = constraintName;
    wrapper[variant] = query;
  }
  return wrapper;
}
function heatmap() {
  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  if (argLen < 1) {
    throw new Error('no region or divisions for heat map');
  }

  var hmap = {};
  switch(argLen) {
  case 3:
    var first  = args[0];
    var second = args[1];
    var third  = args[2];
    var region = null;
    if (valcheck.isObject(first)) {
      region = first;
      hmap.latdivs = second;
      hmap.londivs = third;
    } else if (valcheck.isObject(third)) {
      region = third;
      hmap.latdivs = first;
      hmap.londivs = second;
    } else {
      throw new Error('no first or last region for heat map');
    }

    var keys = ['s', 'w', 'n', 'e'];
    for (var i=0; i < keys.length; i++) {
      var key   = keys[i];
      var value = region[key];
      if (!valcheck.isNullOrUndefined(value)) {
        hmap[key] = value;
        continue;
      } else {
        var altKey = null;
        switch(key) {
        case 's':
          altKey = 'south'; 
          break;
        case 'w':
          altKey = 'west'; 
          break;
        case 'n':
          altKey = 'north'; 
          break;
        case 'e':
          altKey = 'east'; 
          break;
        }
        value = (altKey !== null) ? region[altKey] : null;
        if (!valcheck.isNullOrUndefined(value)) {
          hmap[key] = value;
          continue;
        }
      }
      throw new Error('heat map does not have '+key+' key');
    }
    break;
  case 6:
    hmap.latdivs = args[0];
    hmap.londivs = args[1];
    hmap.s = args[2];
    hmap.w = args[3];
    hmap.n = args[4];
    hmap.e = args[5];
    break;
  default:
    throw new Error('could not assign parameters to heat map');
  }

  return {'heatmap': hmap};
}
function geoOption() {
  return {'geo-option': mlutil.asArray.apply(null, arguments)};
}
function latlon() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length != 2)
    throw new Error('incorrect parameters: '+args);
  return {latitude: args[0], longitude: args[1]};
}
/**
 * Builds a query that applies the subquery to document lock fragments by contrast
 * with the {@link queryBuilder#documentFragment} function.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.Query} query - the query that must match document lock fragments
 * @returns {queryBuilder.Query} a composable query
 */
function locks() {  
  return {'locks-query': mlutil.first.apply(null, arguments)};
}
/**
 * Builds a query that matches the subqueries within a specified proximity.
 * @method
 * @memberof queryBuilder#
 * @param {...queryBuilder.Query} subquery - a word, value, range, geospatial,
 * or other query or a composer such as an or query.
 * @param {queryBuilder.number} [distance] - the maximum number of words
 * between any two matching subqueries
 * @param {queryBuilder.WeightParam} [weight] - a weight returned
 * by {@link queryBuilder#weight} to increase or decrease the score
 * of subqueries relative to other queries in the complete search
 * @param {queryBuilder.OrderParam} [ordering] - the ordering on the subqueries
 * returned from {@link queryBuilder#ordered}
 * @returns {queryBuilder.Query} a composable query
 */
function near() {
  var args = mlutil.asArray.apply(null, arguments);
  var query = {
    queries: []
  };
  var seekingDistance = true;
  var seekingOrdered = true;
  var seekingWeight = true;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (seekingOrdered && arg.ordered !== null && arg.ordered !== undefined) {
      query.ordered = arg.ordered;
      seekingOrdered = false;
    } else if (seekingWeight && arg.weight) {
      query.weight = arg.weight;
      seekingWeight = false;
    } else if (seekingDistance && valcheck.isNumber(arg)) {
      query.distance = arg;
      seekingDistance = false;
    } else if (arg instanceof Array){
      Array.prototype.push.apply(query.queries, arg);
    } else {
      query.queries.push(arg);
    }
  }
  return {'near-query': query};
}
/**
 * Builds a query that removes any documents matched by the subquery.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.Query} subquery - a word, value, range, geospatial,
 * or other query or a composer such as an or query.
 * @returns {queryBuilder.Query} a composable query
 */
function not() {  
  return {'not-query': mlutil.first.apply(null, arguments)};
}
/**
 * Builds a query for the union intersection of subqueries.
 * @method
 * @memberof queryBuilder#
 * @param {...queryBuilder.Query} subquery - a word, value, range, geospatial,
 * or other query or a composer such as an and query.
 * @returns {queryBuilder.Query} a composable query
 */
function or() {
  return {'or-query':{
      queries: mlutil.asArray.apply(null, arguments)
    }};
}
/**
 * The ordering returned by the {@link queryBuilder#ordered} function.
 * @typedef {object} queryBuilder.OrderParam
 */
/**
 * Specifies ordering for an {@link queryBuilder#and} or
 * {@link queryBuilder#near} query.
 * @method
 * @memberof queryBuilder#
 * @param {boolean} isOrdered - whether subqueries are ordered
 * @returns {queryBuilder.OrderParam} a query flag for ordering
 */
function ordered() {
  return {ordered: mlutil.first.apply(null, arguments)};
}
/**
 * Specifies a path configured as an index on the server.
 * @method
 * @memberof queryBuilder#
 * @param {string} pathExpression - the indexed path
 * @param {object} namespaces - bindings between the prefixes in the path and
 * namespace URIs
 * @returns {queryBuilder.IndexedName} an indexed name for specifying a query
 */
function pathIndex() {
  var args = mlutil.asArray.apply(null, arguments);
  var query = null;
  switch(args.length) {
  case 0:
    throw new Error('missing index: '+args);
  case 1:
    query = {
      text: args[0]
    };
    break;
  default:
    query = {
      text: args[0],
      namespaces: args[1]
    };
    break;
  }
  return {'path-index': query};
}
function point() {
  var args = mlutil.asArray.apply(null, arguments);
  var region = null;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    switch(i) {
    case 0:
      if (arg.latitude && arg.longitude) {
        region = arg;
      } else {
        region = {latitude: arg};
      }
      break;
    case 1:
      region.longitude = arg;
      break;
    default:
      throw new Error('unsupported parameter: '+arg);
    }
  }
  return {point: [region]};
}
function polygon() {
  var args = mlutil.asArray.apply(null, arguments);
  var points = [];
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (arg.point) {
      points.push(arg.point[0]);
    } else if (arg.latitude && arg.longitude) {
      points.push(arg);
    } else if (arg instanceof Array && arg.length === 2){
      points.push({latitude: arg[0], longitude: arg[1]});
    } else {
      throw new Error('unsupported parameter: '+arg);
    }
  }
  return {polygon:{point: points}};
}
/**
 * Builds a query that applies the subquery to document metadata by contrast
 * with the {@link queryBuilder#documentFragment} function.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.Query} query - the query that must match document metadata
 * properties
 * @returns {queryBuilder.Query} a composable query
 */
function properties() {  
  return {'properties-query': mlutil.first.apply(null, arguments)};
}
function property() {
  return {'json-property': mlutil.first.apply(null, arguments)};
}
/**
 * A namespaced name for an element or attribute returned
 * by the {@link queryBuilder#qname} function.
 * @typedef {object} queryBuilder.QName
 */
/**
 * Specifies an XML qualified name.
 * @method
 * @memberof queryBuilder#
 * @param {string|string[]} parts - the namespace URI and name
 * for the QName supplied either as two strings or as an array with
 * two strings.
 * @returns {queryBuilder.QName} a QName for identifying
 * an element or attribute
 */
function qname() {
  return {qname: nsName.apply(null, arguments)};
}
function nsName(args) {
  var args = mlutil.asArray.apply(null, arguments);
  switch(args.length) {
  case 0:
    throw new Error('no name');
  case 1:
    return {name: args[0]};
  case 2:
    return {ns: args[0], name: args[1]};
  default:
    throw new Error('too many arguments: '+args.length);
  }
}
/**
 * Builds a query over a range index. You must supply either a comparison
 * operator with one or more values or a binding to parse the comparison and
 * value from a query string but not both. You can provide both named and
 * default bindings for the same query.
 * @method
 * @memberof queryBuilder#
 * @param {string|queryBuilder.IndexedName} indexedName - the JSON 
 * property, XML element or attribute, field, or path providing the values
 * to the range index
 * @param {queryBuilder.DatatypeParam} [datatype] - a datatype returned
 * by the {@link queryBuilder#datatype} to identify the index
 * @param {string} [comparison] - an operator from the enumeration
 * =|!=|<|<=|>|>= defaulting to the = (equivalence) operator
 * @param [...value] - one or more values for comparison with the indexed values
 * @param {queryBuilder.BindingParam} [binding] - a binding
 * (returned by the {@link queryBuilder#bind} function) for parsing the
 * comparison operator and value from tagged values in a query string 
 * @param {queryBuilder.DefaultBindingParam} [defaultBinding] - a binding
 * (returned by the {@link queryBuilder#bindDefault} function) for parsing
 * the comparison operator and value from untagged values in a query string 
 * @param {queryBuilder.FragmentScopeParam} [fragmentScope] - whether the query
 * applies to document content (the default) or document metadata properties
 * as returned by the {@link queryBuilder#fragmentScope} function
 * @param {queryBuilder.RangeOptionsParam} [options] - options
 * from {@link queryBuilder#rangeOptions} modifying the default behavior
 * @returns {queryBuilder.Query} a composable query
 */
function range() {
  var args = mlutil.asArray.apply(null, arguments);
  var constraint = {};
  var constraintIndex = null;
  var values = null;
  var operator = null;
  var seekingDatatype = true;
  var seekingFragmentScope = true;
  var seekingRangeOption = true;
  var constraintName;
  var defaultConstraint;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (i === 0) {
      constraintIndex = asIndex(arg);
      addIndex(constraint, constraintIndex, true);
    } else if (seekingDatatype && arg.datatype !== undefined) {
      constraint.type = arg.datatype;
      if (arg.collation) {
        constraint.collation = arg.collation;
      }
      seekingDatatype = false;
    } else if (seekingFragmentScope && arg['fragment-scope'] !== undefined) {
      constraint['fragment-scope'] = arg['fragment-scope'];
      seekingFragmentScope = false;
    } else if (seekingRangeOption && arg['range-option'] !== undefined) {
      constraint['range-option'] = arg['range-option'];
      seekingRangeOption = false;
    } else if (arg instanceof Array){
      if (values === null) {
        values = arg;
      } else {
        Array.prototype.push.apply(values, arg);        
      }
    } else if ((seekingDatatype || operator === null) && valcheck.isString(arg)) {
      var testType = (seekingDatatype) ? datatypes[arg.trim()] : null;
      if (testType) {
        constraint.type = testType;
        seekingDatatype = false;
      } else {
        var testComp = (operator === null) ? comparisons[arg.trim()] : null;
        if (testComp !== null && testComp !== undefined) {
          operator = testComp;
        } else if (values === null) {
          values = [arg];
        } else {
          values.push(arg);
        }
      }
    } else {
      if (constraintName === undefined) {
        constraintName = arg.constraintName;
        if (constraintName !== undefined) {
          continue;
        }
      }
      if (defaultConstraint === undefined) {
        defaultConstraint = arg.defaultConstraint;
        if (defaultConstraint !== undefined) {
          continue;
        }
      }
      if (values === null) {
        values = [arg];
      } else {
        values.push(arg);
      }
    }
  }

  var wrapper = {};
  if (values !== null) {
    if (constraintName === undefined) {
      constraint['range-operator'] = (operator !== null) ? operator : 'EQ';
      constraint.value = values;
      wrapper['range-query'] = constraint;
    } else {
      throw new Error('range has both binding and query: '+args);
    }
  } else if (defaultConstraint !== undefined) {
    wrapper['default'] = {range: constraint};
  } else {
    if (constraintName === undefined) {
      constraintName = defaultConstraintName(constraintIndex);
      if (constraintName === null) {
        throw new Error('could not default constraint name from '+
            Object.keys(constraintIndex).join(', ') + ' index'
            );
      }
    }
    wrapper.name = constraintName;
    wrapper.range = constraint;
  }

  return wrapper;
}
/**
 * Options for a range query returned by the {@link queryBuilder#rangeOptions}
 * function.
 * @typedef {object} queryBuilder.RangeOptionsParam
 */
/**
 * Provides options modifying the default behavior
 * of a {@link queryBuilder#range} query.
 * @method
 * @memberof queryBuilder#
 * @param {...string} options - options supported for range queries
 * @returns {queryBuilder.RangeOptionsParam} options for a range query
 */
function rangeOption() {
  return {'range-option': mlutil.asArray.apply(null, arguments)};
}
function southWestNorthEast() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length != 4)
    throw new Error('incorrect parameters: '+args);
  return {south: args[0], west: args[1], north: args[2], east: args[3]};
}
function term() {
  var args = mlutil.asArray.apply(null, arguments);
  var query = {
      text: []
  };
  var seekingWeight = true;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (seekingWeight && arg.weight) {
      query.weight = arg.weight;
      seekingWeight = false;
    } else if (arg instanceof Array){
      Array.prototype.push.apply(query.text, arg);
    } else if (seekingWeight && valcheck.isNumber(arg)) {
      query.weight = arg;
      seekingWeight = false;
    } else {
      query.text.push(arg);
    }
  }
  return {'term-query': query};
}
function termOption() {
  return {'term-option': mlutil.asArray.apply(null, arguments)};
}
function textQuery(variant, args) {
  var constraint = {};
  var constraintIndex = null;
  var text = null;
  var seekingFragmentScope = true;
  var seekingTermOption = true;
  var seekingWeight = true;
  var constraintName;
  var defaultConstraint;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (i === 0) {
      constraintIndex = asIndex(arg);
      addIndex(constraint, constraintIndex, true);
    } else if (seekingFragmentScope && arg['fragment-scope']) {
      constraint['fragment-scope'] = arg['fragment-scope'];
      seekingFragmentScope = false;
    } else if (seekingTermOption && arg['term-option']) {
      constraint['term-option'] = arg['term-option'];
      seekingTermOption = false;
    } else if (seekingWeight && arg.weight) {
      constraint.weight = arg.weight;
      seekingWeight = false;
    } else if (arg instanceof Array) {
      if (text === null) {
        text = arg;
      } else {
        Array.prototype.push.apply(text, arg);        
      }
    } else {
      if (constraintName === undefined) {
        constraintName = arg.constraintName;
        if (constraintName !== undefined) {
          continue;
        }
      }
      if (defaultConstraint === undefined) {
        defaultConstraint = arg.defaultConstraint;
        if (defaultConstraint !== undefined) {
          continue;
        }
      }
      if (text === null) {
        text = [arg];
      } else {
        text.push(arg);
      }
    }
  }

  var wrapper = {};
  if (text !== null) {
    if (constraintName === undefined) {
      constraint.text = text;
      wrapper[variant+'-query'] = constraint;
    } else {
      throw new Error(variant+' has both binding and query: '+args);      
    }
  } else if (defaultConstraint !== undefined) {
    var nested = {};
    nested[variant] = constraint;
    wrapper['default'] = nested;
  } else {
    if (constraintName === undefined) {
      constraintName = defaultConstraintName(constraintIndex);
      if (constraintName === null) {
        throw new Error('could not default constraint name from '+
            Object.keys(constraintIndex).join(', ') + ' index'
            );
      }
    }
    wrapper.name = constraintName;
    wrapper[variant] = constraint;
  }
  
  return wrapper;
}
function value() {
  return textQuery('value', mlutil.asArray.apply(null, arguments));
}
/**
 * The weight modification returned by the {@link queryBuilder#weight} function.
 * @typedef {object} queryBuilder.WeightParam
 */
/**
 * Increases or decreases the contribution of the query relative
 * to other queries in the result documents ranking.
 * @method
 * @memberof queryBuilder#
 * @param {number} modifier - a number between -16 and 64 modifying
 * the contribution of the query to the score
 * @returns {queryBuilder.WeightParam} a query flag for weight
 */
function weight() {
  return {weight: mlutil.first.apply(null, arguments)};
}
function word() {
  return textQuery('word', mlutil.asArray.apply(null, arguments));
}

function QueryBuilder() {
}
QueryBuilder.prototype.where       = where;
QueryBuilder.prototype.calculate   = calculate;
QueryBuilder.prototype.orderBy     = orderBy;
QueryBuilder.prototype.slice       = slice;
QueryBuilder.prototype.withOptions = withOptions;

function copyFromQueryBuilder(otherQueryBuilder) {
  var qb = new QueryBuilder();
  if (!valcheck.isNullOrUndefined(otherQueryBuilder)) {
    var clauseKeys = [
      'whereClause', 'calculateClause', 'orderByClause',
      'sliceClause', 'withOptionsClause'
    ];
    var isString = valcheck.isString(otherQueryBuilder);
    var other = isString ?
        JSON.parse(otherQueryBuilder) : otherQueryBuilder;
    for (var i=0; i < clauseKeys.length; i++){
      var key = clauseKeys[i];
      var value = other[key];
      if (!valcheck.isNullOrUndefined(value)) {
        // deepcopy instead of clone to avoid preserving prototype
        qb[key] = isString ? value : deepcopy(value);
      }
    }
  }
  return qb;
}

function where() {
  var self = (this instanceof QueryBuilder) ? this : new QueryBuilder();

  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  // TODO: if empty, clear the clause

  var parsedQuery;
  var fragmentScope;
  var queries = null;

  var isQBE = false;
  switch(argLen) {
  case 0:
    self.whereClause = {query: {queries: [and()]}};
    break;
  case 1:
    var firstQuery = args[0];
    if (firstQuery.$query !== undefined) {
      isQBE = true;
      self.whereClause = firstQuery;
    } else {
      var firstWhereClause = {};
      parsedQuery = firstQuery.parsedQuery;
      if (parsedQuery === undefined) {
        firstWhereClause.query = {queries: args};
      } else {
        firstWhereClause.parsedQuery = parsedQuery;
      }
      self.whereClause = firstWhereClause;
    }
    break;
  default:
    for (var i=0; i < argLen; i++) {
      var arg = args[i];
      if (parsedQuery === undefined) {
        parsedQuery = arg.parsedQuery;
        if (parsedQuery !== undefined) {
          continue;
        }
      }
      if (fragmentScope === undefined) {
        fragmentScope = arg['fragment-scope'];
        if (fragmentScope !== undefined) {
          continue;
        }
      }
      if (queries === null) {
        queries = [arg];
      } else {
        queries.push(arg);        
      }
    }
    var whereClause = {};
    if (queries !== null) {
      whereClause.query = {queries: queries};
    }
    if (parsedQuery !== undefined) {
      whereClause.parsedQuery = parsedQuery;
    }
    if (fragmentScope !== undefined) {
      whereClause['fragment-scope'] = fragmentScope;
    }
    self.whereClause = whereClause;

    break;
  }

  self.queryType   = (isQBE) ? 'qbe' : 'structured';
  self.queryFormat = 'json';

  return self;
}

function byExample() {
  var args = mlutil.asArray.apply(null, arguments);
  switch(args.length) {
  case 0:
    return {$query: []};
  case 1:
    var query = args[0];
    if (valcheck.isNullOrUndefined(query['$query'])) {
      return {$query: query};
    }
    return query;
  default:
    return {$query: args};
  }
}

function orderBy() {
  var self = (this instanceof QueryBuilder) ? this : new QueryBuilder();

  var args = mlutil.asArray.apply(null, arguments);
  // TODO: if empty, clear the clause

  var sortOrder = [];
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    sortOrder.push(valcheck.isString(arg) ? sort(arg) : arg);
  }

  self.orderByClause = {
    'sort-order': sortOrder
  };

  return self;
}

function score() {
  return {
    score: (arguments.length === 0) ? null : arguments[0]
  };
}

function sort() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length === 0) {
    throw new Error('missing sorted index: '+args);
  }

  var firstIndex = asIndex(args[0]);
  // null is a legitimate value of score
  var isScore    = (!valcheck.isUndefined(firstIndex['score']));

  var sorter = {};
  if (isScore) {
    sorter.score = firstIndex.score;
  } else {
    addIndex(sorter, firstIndex, false);
  }

  for (var i=1; i < args.length; i++) {
    var arg = args[i];
    if (valcheck.isString(arg)) {
      switch (arg) {
      case 'ascending':
      case 'descending':
        sorter.direction = arg;
        break;
      default:
        if (!isScore && arg.match(/^xs:/)) {
          sorter.type = arg;
        }
        break;
      }
    } else if (isScore) {
    } else if (!valcheck.isNullOrUndefined(arg['datatype'])) {
      sorter.type = arg.datatype;
      if (!valcheck.isNullOrUndefined(arg['collation'])) {
        sorter.collation = arg.collation;
      }
    } else if (!valcheck.isNullOrUndefined(arg['collation'])) {
      sorter.type = 'xs:string';
      sorter.collation = arg.collation;
    }
  }

  return sorter;
}

function slice() {
  var self = (this instanceof QueryBuilder) ? this : new QueryBuilder();

  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  // TODO: if empty, clear the clause

  var pageStart  = (argLen > 1 || (argLen === 1 && valcheck.isNumber(args[0]))) ?
      args[0] : null;
  var pageLength = (argLen > 2 || (argLen === 2 && valcheck.isNumber(args[1]))) ?
      args[1] : null;

  var sliceClause = {};

  if (pageStart !== null && pageLength !== 0) {
    if (pageStart === 0 && pageLength === null) {
      sliceClause['page-length'] = 0;
    } else {
      sliceClause['page-start'] = pageStart ;
    }
  }
  if (pageLength !== null) {
    sliceClause['page-length'] = pageLength;
  } 

// TODO: iterator

  self.sliceClause = sliceClause;

  return self;
}

function calculate() {
  var self = (this instanceof QueryBuilder) ? this : new QueryBuilder();

  var args = mlutil.asArray.apply(null, arguments);

  // TODO: distinguish facets and values
  var calculateClause = {
      constraint: args
  };
  
  self.calculateClause = calculateClause;

  return self;
}

function facet() {
  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  if (argLen < 1) {
    throw new Error('facet must at a minimum identify the index');
  }

  var constraintName = null;
  var constraintIndex = null;
  var datatype;
  var facetOptions;
  var calculateFunction;
  var buckets = null;
  var computedBuckets = null;
  
  for (var i=0; i < argLen; i++) {
    var arg = args[i];
    switch(i) {
    case 0:
      if (valcheck.isString(arg)) {
        constraintName = arg;
      } else {
        constraintIndex = arg;
      }
      continue;
    case 1:
      if (!valcheck.isNullOrUndefined(arg['start-facet']) &&
          !valcheck.isNullOrUndefined(arg['finish-facet'])) {
        calculateFunction = arg;
        continue;
      }
      if (constraintIndex === null) {
        if (valcheck.isString(arg)) {
          constraintIndex = property(arg);
          continue;
        } else if (arg['json-property'] || arg.element || arg.field || arg['path-index'] ||
            arg.collection !== undefined) {
          constraintIndex = arg;
          continue;
        }
      }
    }
    if (datatype === undefined) {
      datatype = arg.datatype;
      if (datatype !== undefined) {
        continue;
      }
    }
    if (facetOptions === undefined) {
      facetOptions = arg['facet-option'];
      if (facetOptions !== undefined) {
        continue;
      }
    }
    if (calculateFunction === undefined &&
        !valcheck.isNullOrUndefined(arg['start-facet']) &&
        !valcheck.isNullOrUndefined(arg['finish-facet'])) {
      calculateFunction = arg;
      continue;
    }
    // TODO: 
    var bucket = arg.bucket;
    if (bucket !== undefined) {
      if (buckets === null) {
        buckets = [bucket];
      } else {
        buckets.push(bucket);
      }
      continue;
    }
    bucket = arg.computedBucket;
    if (bucket !== undefined) {
      if (computedBuckets === null) {
        computedBuckets = [bucket];
      } else {
        computedBuckets.push(bucket);
      }
      continue;
    }
  }
  if (constraintIndex === null) {
    constraintIndex = property(constraintName);
  } else if (constraintName === null) {
    constraintName = defaultConstraintName(constraintIndex);
    if (constraintName === null) {
      throw new Error('could not default constraint name from '+
          Object.keys(constraintIndex).join(', ') + ' index'
          );
    }
  }

  var facetWrapper = {name: constraintName};
  var constraint = {facet: true};
  if (constraintIndex.collection !== undefined) {
    facetWrapper.collection = constraint;
  } else if (calculateFunction !== undefined) {
    constraint['start-facet']  = calculateFunction['start-facet'];
    constraint['finish-facet'] = calculateFunction['finish-facet'];
    facetWrapper.custom = constraint;
  } else {
    facetWrapper.range = constraint;
    // TODO: datatype optional instead of defaulted
    constraint.type = ((datatype !== undefined) ? datatype : 'xs:string');
    var constraintKeys = Object.keys(constraintIndex);
    var constraintKeyLen = constraintKeys.length;
    for (var i=0; i < constraintKeyLen; i++) {
      var key = constraintKeys[i];
      constraint[key] = constraintIndex[key];
    }
    if (buckets !== null) {
      constraint.bucket = buckets;
    }
    if (computedBuckets !== null) {
      constraint['computed-bucket'] = computedBuckets;
    }
  }
  if (facetOptions !== undefined) {
    constraint['facet-option'] = facetOptions;    
  }

  return facetWrapper;
}

function calculateFunction() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length < 1) {
    throw new Error('calculate function without module name');
  }

  var moduleName = args[0];

  return {
      'start-facet': {
        apply: 'start-facet',
        ns:    'http://marklogic.com/query/custom/'+moduleName,
        at:    '/ext/marklogic/query/custom/'+moduleName+'.xqy'
      },
      'finish-facet': {
        apply: 'finish-facet',
        ns:    'http://marklogic.com/query/custom/'+moduleName,
        at:    '/ext/marklogic/query/custom/'+moduleName+'.xqy'
      }
  };

}

function facetOptions() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length < 1) {
    throw new Error('no facet options');
  }
  return {'facet-option': args};
}
function bucket() {
  var bucketWrapper = {name: arguments[0], label: arguments[0]};
  switch(arguments.length) {
  case 0:
  case 1:
    break;
  case 2:
    var anchor = arguments[1].anchor;
    var value  = arguments[1].value;
    if (anchor && value instanceof Array) {
      bucketWrapper.anchor = anchor;
      var isBucket = (value.length === 2) ?
          twoValueBucket(bucketWrapper, value[0], value[1]) :
          threeValueBucket(bucketWrapper, null, value[0], value[1], null, value[2]);
      if (isBucket) {
        return {computedBucket: bucketWrapper};
      }
    }
    break;
  case 3:
    if (twoValueBucket(bucketWrapper, arguments[1], arguments[2])) {
      return {bucket: bucketWrapper};
    }
    break;
  case 4:
    var anchor1    = arguments[1].anchor;
    var value1     = (anchor1) ? arguments[1].value[0] : arguments[1];
    var comparator = arguments[2];
    var anchor2    = arguments[3].anchor;
    var value2     = (anchor2) ? arguments[3].value[0] : arguments[3];
    if (threeValueBucket(bucketWrapper, anchor1, value1, comparator, anchor2, value2)) {
      if (anchor1 || anchor2) {
        return {computedBucket: bucketWrapper};
      }
      return {bucket: bucketWrapper};
    }
    break;
  }
  throw new Error('a bucket must have a name, a comparison, and bounds (with or without anchors)');
}
function anchor() {
  var args = mlutil.asArray.apply(null, arguments);
  switch(args.length) {
  case 0:
  case 1:
    break;
  case 2:
  case 3:
  case 4:
    return {
      anchor: args[0],
      value: args.slice(1)
    };
  default:
    break;
  }
  throw new Error('must specify anchor and at least one value');
}
function twoValueBucket(bucket, value1, value2) {
  if (     value1 === '<') bucket.lt = value2;
  else if (value2 === '>') bucket.lt = value1;
  else if (value1 === '>') bucket.ge = value2;
  else if (value2 === '<') bucket.ge = value1;
  else return false;
  return true;
}
function threeValueBucket(bucket, anchor1, value1, comparator, anchor2, value2) {
  if (comparator === '<') {
    bucket.ge = value1;
    if (anchor1) {
      bucket['ge-anchor'] = anchor1;
    }
    bucket.lt = value2;
    if (anchor2) {
      bucket['lt-anchor'] = anchor2;
    }
  } else if (comparator === '>') {
    bucket.lt = value1;
    if (anchor1) {
      bucket['lt-anchor'] = anchor1;
    }
    bucket.ge = value2;
    if (anchor2) {
      bucket['ge-anchor'] = anchor2;
    }
  } else {
    return false;
  }
  return true;
}
function defaultConstraintName(index) {
  var name = index['json-property'];
  if (name !== undefined) {
    return name;
  }
  name = index.field;
  if (name !== undefined) {
    return name;
  }
  name = index.element;
  if (name !== undefined && index.attribute === undefined) {
    return name;
  }
  return null;
}

function parsedFrom() {
  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  if (arguments.length < 1) {
    throw new Error('no query text');
  }

  var parsedQuery = {qtext: args[0]};
  var constraints;
  var term;
  for (var i=1; i < argLen; i++) {
    var arg = args[i];
    if (constraints === undefined) {
      constraints = arg.constraint;
      if (constraints !== undefined) {
        parsedQuery.constraint = constraints;
      }
    }
    if (term === undefined) {
      term = arg.term;
      if (term !== undefined) {
        parsedQuery.term = term;
      }
    }
  }

  return {parsedQuery: parsedQuery};
}

function parseBindings() {
  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  if (argLen < 1) {
    throw new Error('no bindings for the query text');
  }

  var bindings = {};

  var constraints;
  var defaultConstraints;
  var empty;
  var term;
  for (var i=0; i < argLen; i++) {
    var arg = args[i];
    if (arg.name !== undefined) {
      if (constraints === undefined) {
        constraints = [arg];
      } else {
        constraints.push(arg);
      }
      bindings.constraint = constraints;
      continue;
    }
    if (defaultConstraints === undefined) {
      defaultConstraints = arg['default'];
      if (defaultConstraints !== undefined) {
        if (term === undefined) {
          term = {};
          bindings.term = term;
        }
        term['default'] = defaultConstraints;
        continue;
      }
    }
    if (empty === undefined) {
      empty = arg.empty;
      if (empty !== undefined) {
        if (term === undefined) {
          term = {};
          bindings.term = term;
        }
        term.empty = empty;
        continue;
      }
    }    
    // TODO: special handling for custom
  }

  return bindings;
}
/**
 * A binding returned by the {@link queryBuilder#bind} function
 * for parsing a query string. The binding declares a constraint name
 * that tags the values in the query string and occupies the position
 * of the values in a query.
 * @typedef {object} queryBuilder.BindingParam
 */
/**
 * Specifies a constraint name that binds values provided by a parsed
 * query string to a query. The values are tagged with the constraint
 * name in the query string. The binding occupies the position of the
 * values in the query specification.
 * @method
 * @memberof queryBuilder#
 * @param {string} parts - the constraint name
 * @returns {queryBuilder.BindingParam} the binding for the constraint name
 */
function bind() {
  if (arguments.length === 0) {
    throw new Error('no name to bind as a constraint');
  }
  return {constraintName: arguments[0]};
}
/**
 * A binding returned by the {@link queryBuilder#bindDefault} function
 * for parsing a query string. The binding associates untagged values
 * in the query string with a query, occupying the position of the
 * values in a query. A search can have only one default binding.
 * @typedef {object} queryBuilder.DefaultBindingParam
 */
/**
 * Binds untagged values provided by a parsed query string to a query. The
 * binding occupies the position of the values in the query specification.
 * A search can have only one default binding.
 * @method
 * @memberof queryBuilder#
 * @returns {queryBuilder.DefaultBindingParam} the binding for the constraint name
 */
function bindDefault() {
  return {defaultConstraint: true};
}
function bindEmptyAs() {
  return {'empty':{'apply': 'all-results'}};
}
function parseFunction() {
  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  if (argLen < 2) {
    throw new Error('query parse function without module name or binding');
  }

  var moduleName = args[0];

  var constraint = {
      parse: {
        apply: 'parse',
        ns:    'http://marklogic.com/query/custom/'+moduleName,
        at:    '/ext/marklogic/query/custom/'+moduleName+'.xqy'
      },
      facet: false
  };

  var seekingTermOption = true;
  var constraintName;
  for (var i=1; i < args.length; i++) {
    var arg = args[i];
    if (seekingTermOption && arg['term-option']) {
      constraint['term-option'] = arg['term-option'];
      seekingTermOption = false;
    } else {
      if (constraintName === undefined) {
        constraintName = arg.constraintName;
      }
    }
  }

  if (!valcheck.isString(constraintName)) {
    throw new Error('query parse function without a binding to a constraint name');
  }

  return {
    name:   constraintName,
    custom: constraint
    };
}

function withOptions() {
  var self = (this instanceof QueryBuilder) ? this : new QueryBuilder();

  // TODO: share with documents.js
  var optionKeyMapping = {
    search:'search-option',     weight:'quality-weight',
    forestNames:'forest-names', similarDocs:'return-similar',
    metrics:'return-metrics',   relevance:'return-relevance',
    queryPlan:'return-plan',    debug:'debug',
    concurrencyLevel:'concurrency-level',
    categories:true,            txid:true
  };

  var withOptionsClause = {};
  if (0 < arguments.length) {
    var arg = arguments[0];
    var argKeys = Object.keys(arg);
    for (var i=0; i < argKeys.length; i++) {
      var key = argKeys[i];
      if (optionKeyMapping[key] !== undefined) {
        var value = arg[key];
        if (value !== undefined) {
          withOptionsClause[key] = value;
        }
      }
    }
  }
  self.withOptionsClause = withOptionsClause;

  return self;
}

module.exports = {
    anchor:             anchor,
    and:                and,
    andNot:             andNot,
    attribute:          attribute,
    bind:               bind,
    bindDefault:        bindDefault,
    bindEmptyAs:        bindEmptyAs,
    boost:              boost,
    box:                box,
    bucket:             bucket,
    calculate:          calculate,
    calculateFunction:  calculateFunction,
    circle:             circle,
    collection:         collection,
    copyFrom:           copyFromQueryBuilder,
    datatype:           datatype,
    directory:          directory,
    document:           document,
    documentFragment:   documentFragment,
    element:            element,
    facet:              facet,
    facetOptions:       facetOptions,
    field:              field,
    fragmentScope:      fragmentScope,
    geoAttributePair:   geoAttributePair,
    geoElement:         geoElement,
    geoElementPair:     geoElementPair,
    geoPath:            geoPath,
    geoOption:          geoOption,
    heatmap:            heatmap,
    latlon:             latlon,
    locks:              locks,
    near:               near,
    not:                not,
    pathIndex:          pathIndex,
    point:              point,
    polygon:            polygon,
    properties:         properties,
    property:           property,
    byExample:          byExample,
    qname:              qname,
    or:                 or,
    orderBy:            orderBy,
    ordered:            ordered,
    parseBindings:      parseBindings,
    parsedFrom:         parsedFrom,
    parseFunction:      parseFunction,
    range:              range,
    rangeOption:        rangeOption,
    score:              score,
    scope:              scope,
    slice:              slice,
    sort:               sort,
    southWestNorthEast: southWestNorthEast,
    term:               term,
    termOption:         termOption,
    value:              value,
    weight:             weight,
    where:              where,
    withOptions:        withOptions,
    word:               word
};