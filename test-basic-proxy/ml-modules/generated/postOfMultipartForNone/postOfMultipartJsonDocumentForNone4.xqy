xquery version "1.0-ml";

declare option xdmp:mapping "false";

declare variable $param1 as document-node()+ external;
let $errorList := json:array()
let $funcdef   := xdmp:from-json-string('{
  "functionName" : "postOfMultipartJsonDocumentForNone4",
  "params" : [ {
    "name" : "param1",
    "datatype" : "jsonDocument",
    "multiple" : true,
    "nullable" : false
  } ]
}')
let $fields   := map:map()
let $fields   := xdmp:apply(xdmp:function(xs:QName("addField"), "/dbf/test/testInspector.sjs"),
    "/dbf/test/postOfMultipartForNone/postOfMultipartJsonDocumentForNone4", $fields, "param1", $param1
    )

let $fields   := xdmp:apply(xdmp:function(xs:QName("getFields"), "/dbf/test/testInspector.sjs"),
    $funcdef, $fields, $errorList
    )
return xdmp:apply(xdmp:function(xs:QName("makeResult"), "/dbf/test/testInspector.sjs"),
    "/dbf/test/postOfMultipartForNone/postOfMultipartJsonDocumentForNone4", $funcdef, $fields, $errorList
    )
