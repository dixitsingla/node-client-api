xquery version "1.0-ml";

declare option xdmp:mapping "false";


let $errorList := json:array()
let $funcdef   := xdmp:from-json-string('{
  "functionName" : "postOfNoneForDocumentJsonDocument0",
  "return" : {
    "datatype" : "jsonDocument",
    "multiple" : false,
    "nullable" : false
  }
}')
let $fields   := map:map()

let $fields   := xdmp:apply(xdmp:function(xs:QName("getFields"), "/dbf/test/testInspector.sjs"),
    $funcdef, $fields, $errorList
    )
return xdmp:apply(xdmp:function(xs:QName("makeResult"), "/dbf/test/testInspector.sjs"),
    "/dbf/test/postOfNoneForDocument/postOfNoneForDocumentJsonDocument0", $funcdef, $fields, $errorList
    )
