xquery version "1.0-ml";

declare option xdmp:mapping "false";

declare variable $param1 as document-node()+ external;
let $errorList := json:array()
let $funcdef   := xdmp:from-json-string('{
  "functionName" : "postOfMultipartForMultipartJsonDocument1ReturnNull",
  "params" : [ {
    "name" : "param1",
    "datatype" : "textDocument",
    "multiple" : true,
    "nullable" : false
  } ],
  "return" : {
    "datatype" : "jsonDocument",
    "multiple" : true,
    "nullable" : true
  }
}')
let $fields   := map:map()
let $fields   := xdmp:apply(xdmp:function(xs:QName("addField"), "/dbf/test/testInspector.sjs"),
    "/dbf/test/postOfMultipartForMultipart/postOfMultipartForMultipartJsonDocument1ReturnNull", $fields, "param1", $param1
    )

let $fields   := xdmp:apply(xdmp:function(xs:QName("getFields"), "/dbf/test/testInspector.sjs"),
    $funcdef, $fields, $errorList
    )
return xdmp:apply(xdmp:function(xs:QName("makeResult"), "/dbf/test/testInspector.sjs"),
    "/dbf/test/postOfMultipartForMultipart/postOfMultipartForMultipartJsonDocument1ReturnNull", $funcdef, $fields, $errorList
    )
