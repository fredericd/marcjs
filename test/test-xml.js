/* eslint-disable no-undef */
// eslint-disable-next-line no-unused-vars
//const should = require('should');
//const fs = require('fs');
const  Marcxml = require('../lib/Marcxml');

const xml_selfclosing = `<?xml version="1.0"?>
<collection xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:marc="http://www.loc.gov/MARC21/slim" xsi:schemaLocation="http://www.loc.gov/MARC21/slim http://www.loc.gov/standards/marcxml/schema/MARC21slim.xsd">
<record>
    <leader>00000nam a2200000 a 4500</leader>
    <controlfield tag="001">012301230123</controlfield>
    <controlfield tag="005">0123012301230123012.0</controlfield>
    <controlfield tag="008">0123012s0123    0123   0123      0123 1 0123  </controlfield>
    <datafield tag="010" ind1=" " ind2=" ">
      <subfield code="a">012301230123</subfield>
    </datafield>
    <datafield tag="020" ind1=" " ind2=" ">
      <subfield code="a">0123012301230123 (0123.)</subfield>
    </datafield>
    <datafield tag="020" ind1=" " ind2=" ">
      <subfield code="a">012301230123 (0123.)</subfield>
    </datafield>
    <datafield tag="020" ind1=" " ind2=" ">
      <subfield code="a">0123012301230123 (0123.)</subfield>
    </datafield>
    <datafield tag="020" ind1=" " ind2=" ">
      <subfield code="a">0123012301230123</subfield>
      <subfield code="q">(01230123)</subfield>
    </datafield>
    <datafield tag="035" ind1=" " ind2=" ">
      <subfield code="a">(0123)012301230123</subfield>
    </datafield>
    <datafield tag="035" ind1=" " ind2=" ">
      <subfield code="a">(0123)012301230123</subfield>
    </datafield>
   <datafield tag="040" ind1=" " ind2=" ">
      <subfield code="a">ABC</subfield>
      <subfield code="b">def</subfield>
      <subfield code="e">ghi</subfield>
      <subfield code="c">JKL</subfield>
      <subfield code="d">MNO</subfield>
      <subfield code="d">PQR</subfield>
      <subfield code="d">STU</subfield>
      <subfield code="d">VWX</subfield>
      <subfield code="d">YZA</subfield>
    </datafield>
    <datafield tag="050" ind1="0" ind2="0">
      <subfield code="a">AB12.CD45</subfield>
      <subfield code="b">Xy 1234</subfield>
    </datafield>
    <datafield tag="082" ind1="0" ind2="0">
      <subfield code="a">[Sci]</subfield>
      <subfield code="2">12</subfield>
    </datafield>
    <datafield tag="092" ind1=" " ind2=" ">
      <subfield code="a">SF SERIES L</subfield>
    </datafield>
    <datafield tag="100" ind1="1" ind2=" ">
      <subfield code="a">Smith, John,</subfield>
      <subfield code="e">author.</subfield>
    </datafield>
    <datafield tag="245" ind1="1" ind2="4">
      <subfield code="a">The Galactic Adventures of Space Cat /</subfield>
      <subfield code="c">John Smith.</subfield>
    </datafield>
    <datafield tag="260" ind1=" " ind2=" ">
      <subfield code="a">Mars :</subfield>
      <subfield code="b">Space Press,</subfield>
      <subfield code="c">2023.</subfield>
    </datafield>
    <datafield tag="300" ind1=" " ind2=" ">
      <subfield code="a">200 p. :</subfield>
      <subfield code="b">col. ill. ;</subfield>
      <subfield code="c">24 cm.</subfield>
    </datafield>datafield tag="490" ind1="0" ind2=" ">
      <subfield code="a">Random Title;</subfield>
      <subfield code="v">[1]</subfield>
    </datafield>
    <datafield tag="520" ind1=" " ind2=" ">
      <subfield code="a">RANDOM DESCRIPTION TEXT HERE.</subfield>
    </datafield>
    <datafield tag="521" ind1="1" ind2=" ">
      <subfield code="a">Ages 8-12.</subfield>
    </datafield>
    <datafield tag="600" ind1="0" ind2="0">
      <subfield code="a">Harry Potter</subfield>
      <subfield code="c">(Fictitious character)</subfield>
      <subfield code="v">Juvenile fiction.</subfield>
    </datafield>
    <datafield tag="650" ind1=" " ind2="0">
      <subfield code="a">Wizards</subfield>
      <subfield code="v">Juvenile fiction.</subfield>
    </datafield>
    <datafield tag="650" ind1=" " ind2="0">
      <subfield code="a">Magic</subfield>
      <subfield code="v">Juvenile fiction.</subfield>
    </datafield>
    <datafield tag="650" ind1=" " ind2="0">
      <subfield code="a">Friendship</subfield>
      <subfield code="v">Juvenile fiction.</subfield>
    </datafield>
    <datafield tag="650" ind1=" " ind2="0">
      <subfield code="a">Schools</subfield>
      <subfield code="v">Juvenile fiction.</subfield>
    </datafield>
    <datafield tag="650" ind1=" " ind2="0">
      <subfield code="a">Fantasy</subfield>
      <subfield code="v">Juvenile fiction.</subfield>
    </datafield>
    <datafield tag="596" ind1=" " ind2=" "/>
  </record>
</collection>`;

let res = Marcxml.parse(xml_selfclosing);
let data = JSON.parse(JSON.stringify(res));
console.log(data);

const xml_notselfclosing = `
<?xml version="1.0"?>
<collection xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:marc="http://www.loc.gov/MARC21/slim" xsi:schemaLocation="http://www.loc.gov/MARC21/slim http://www.loc.gov/standards/marcxml/schema/MARC21slim.xsd">
  <record>
    <leader>00001aaa a2200001Ki 4500</leader>
    <controlfield tag="001">1000001</controlfield>
    <controlfield tag="005">1231231231230</controlfield>
    <controlfield tag="008">1234567891m223467891nyua   j 6    000 1 aaa d</controlfield>
    <datafield tag="020" ind1=" " ind2=" ">
      <subfield code="a">1000002</subfield>
      <subfield code="q">v.1 : hardcover)</subfield>
    </datafield>
    <datafield tag="020" ind1=" " ind2=" ">
      <subfield code="a">1000003</subfield>
      <subfield code="q">(v.1 paperback)</subfield>
    </datafield>
    <datafield tag="020" ind1=" " ind2=" ">
      <subfield code="a">1000004</subfield>
      <subfield code="q">v.1 : hardcover)</subfield>
    </datafield>
    <datafield tag="020" ind1=" " ind2=" ">
      <subfield code="a">1000005</subfield>
      <subfield code="q">v.2 : hardcover)</subfield>
    </datafield>
    <datafield tag="020" ind1=" " ind2=" ">
      <subfield code="a">1000006</subfield>
      <subfield code="q">v.2 : hardcover)</subfield>
    </datafield>
    <datafield tag="020" ind1=" " ind2=" ">
      <subfield code="a">1000007</subfield>
      <subfield code="q">v.2 : paperback)</subfield>
    </datafield>
    <datafield tag="020" ind1=" " ind2=" ">
      <subfield code="a">1000008</subfield>
      <subfield code="q">v.3 : hardcover)</subfield>
    </datafield>
    <datafield tag="020" ind1=" " ind2=" ">
      <subfield code="a">1000009</subfield>
      <subfield code="q">v.3 : hardcover)</subfield>
    </datafield>
    <datafield tag="020" ind1=" " ind2=" ">
      <subfield code="a">1000010</subfield>
      <subfield code="q">(v.4 ; hardcover)</subfield>
    </datafield>
    <datafield tag="020" ind1=" " ind2=" ">
      <subfield code="a">1000011</subfield>
      <subfield code="q">(v.4 ; hardcover)</subfield>
    </datafield>
    <datafield tag="035" ind1=" " ind2=" ">
      <subfield code="a">(OCoLC)1000012</subfield>
      <subfield code="z">(OCoLC)1000013</subfield>
    </datafield>
    <datafield tag="035" ind1=" " ind2=" ">
      <subfield code="a">(OCoLC)ocn1000014</subfield>
    </datafield>
    <datafield tag="040" ind1=" " ind2=" ">
      <subfield code="a">AA1</subfield>
      <subfield code="b">eng</subfield>
      <subfield code="e">rda</subfield>
      <subfield code="c">AA1</subfield>
      <subfield code="d">AA2</subfield>
      <subfield code="d">AA3</subfield>
      <subfield code="d">AA4</subfield>
      <subfield code="d">AA5</subfield>
      <subfield code="d">AA6</subfield>
      <subfield code="d">AA7</subfield>
    </datafield>
    <datafield tag="082" ind1="0" ind2="4">
      <subfield code="a">123.4/567</subfield>
      <subfield code="2">12</subfield>
    </datafield>
    <datafield tag="092" ind1=" " ind2=" ">
      <subfield code="a">J GRAPHIC ABC</subfield>
    </datafield>
    <datafield tag="100" ind1="1" ind2=" ">
      <subfield code="a">Author, A. A.,</subfield>
      <subfield code="e">author.</subfield>
    </datafield>
    <datafield tag="245" ind1="1" ind2="0">
      <subfield code="a">Random title /</subfield>
      <subfield code="c">written by A. A. Author ; illustrations by B. B. Illustrator.</subfield>
    </datafield>
    <datafield tag="246" ind1="1" ind2=" ">
      <subfield code="i">At head of title:</subfield>
      <subfield code="a">XYZ PUBLISHERS</subfield>
    </datafield>
    <datafield tag="264" ind1=" " ind2="1">
      <subfield code="a">City :</subfield>
      <subfield code="b">Publisher Inc.,</subfield>
      <subfield code="c">[1234]-</subfield>
    </datafield>
    <datafield tag="300" ind1=" " ind2=" ">
      <subfield code="a">volumes :</subfield>
      <subfield code="b"> color illustrations ;</subfield>
      <subfield code="c">22 cm</subfield>
    </datafield>
    <datafield tag="336" ind1=" " ind2=" ">
      <subfield code="a">text</subfield>
      <subfield code="b">txt</subfield>
      <subfield code="2">rdacontent</subfield>
    </datafield>
    <datafield tag="336" ind1=" " ind2=" ">
      <subfield code="a">still image</subfield>
      <subfield code="b">sti</subfield>
      <subfield code="2">rdacontent</subfield>
    </datafield>
    <datafield tag="337" ind1=" " ind2=" ">
      <subfield code="a">unmediated</subfield>
      <subfield code="b">n</subfield>
      <subfield code="2">rdamedia</subfield>
    </datafield>
    <datafield tag="338" ind1=" " ind2=" ">
      <subfield code="a">volume</subfield>
      <subfield code="b">nc</subfield>
      <subfield code="2">rdacarrier</subfield>
    </datafield>
    <datafield tag="505" ind1="1" ind2="0">
      <subfield code="g">Volume 1.</subfield>
      <subfield code="t">Title of volume 1 --</subfield>
      <subfield code="g">Volume 2.</subfield>
      <subfield code="t">Title of volume 2 --</subfield>
      <subfield code="g">Volume 3.</subfield>
      <subfield code="t">Title of volume 3 --</subfield>
      <subfield code="g">v.4.</subfield>
      <subfield code="t">Title of volume 4 --</subfield>
      <subfield code="g">v.5.</subfield>
      <subfield code="t">Title of volume 5 --</subfield>
    </datafield>
    <datafield tag="520" ind1=" " ind2=" ">
      <subfield code="a">"Description text here."--Back cover of Volume 1.</subfield>
    </datafield>
    <datafield tag="650" ind1=" " ind2="0">
      <subfield code="a">Topic1</subfield>
      <subfield code="v">Comic books, strips, etc.</subfield>
    </datafield>
    <datafield tag="650" ind1=" " ind2="0">
      <subfield code="a">Topic2</subfield>
      <subfield code="v">Comic books, strips, etc.</subfield>
    </datafield>
    <datafield tag="650" ind1=" " ind2="0">
      <subfield code="a">Topic3</subfield>
      <subfield code="v">Comic books, strips, etc.</subfield>
    </datafield>
    <datafield tag="655" ind1=" " ind2="7">
      <subfield code="a">Genre1.</subfield>
      <subfield code="2">lcgft</subfield>
    </datafield>
    <datafield tag="700" ind1="1" ind2=" ">
      <subfield code="a">Illustrator, B. B.,</subfield>
      <subfield code="e">illustrator.</subfield>
    </datafield>
    <datafield tag="710" ind1="2" ind2=" ">
      <subfield code="a">XYZ Publishers, Inc.</subfield>
    </datafield>
  </record>
</collection>
`;

const res2 = Marcxml.parse(xml_notselfclosing);
console.log(res2);