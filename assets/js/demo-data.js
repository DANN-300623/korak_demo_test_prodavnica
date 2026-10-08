/**
 * DEMO PODACI
 * Koriste se SAMO kada je API_URL u config.js prazan – da prodavnica može da se pogleda
 * i pokaže pre povezivanja sa Google Sheet-om. Isti su kao seedDemoData() u Setup.gs.
 * Kada upišete API_URL, ovaj fajl se ignoriše (može i da se obriše iz index.html).
 *
 * Format reda: [ID, naziv, pol, kategorija, cena, boja, pexelsId, pre koliko dana dodat, "veličina:komada ...", opis]
 */
window.KORAK_DEMO = (function () {
  const ROWS = [
  ["SH001","Urban Runner","Muške","Patike",8990,"Crna",28953576,0,"40:2 41:0 42:1 43:3 44:2 45:1","Lagane patike za grad i trčanje po asfaltu. Mrežasto lice diše, a penasti đon ublažava korak ceo dan."],
  ["SH002","Metro Low","Muške","Patike",7490,"Bela",13536939,17,"40:3 41:4 42:2 43:0 44:1","Niske bele patike od glatke kože. Uklapaju se uz farmerke i uz lanene pantalone."],
  ["SH003","Trail Pace","Muške","Patike",9990,"Braon",30309998,34,"41:2 42:2 43:1 44:0","Dvobojne patike sa pojačanom petom i gumenim đonom koji drži i na makadamu."],
  ["SH004","Court Classic","Muške","Patike",8490,"Bela",33629872,51,"40:1 41:2 42:3 43:2 44:1 45:0","Klasičan teniski kroj, prošiveno kožno gornjište i ravan đon. Model koji ne izlazi iz mode."],
  ["SH005","Asfalt Knit","Muške","Patike",6990,"Siva",5526492,8,"40:0 41:3 42:4 43:2 44:2","Pleteni gornji deo koji prati stopalo i uložak od memorijske pene. Za duge dane na nogama."],
  ["SH006","Linija 90","Muške","Patike",10990,"Bela",11324547,25,"41:1 42:2 43:2 44:1","Retro silueta iz devedesetih sa debljim đonom. Kombinacija kože i semiša."],
  ["SH007","Pista Pro","Muške","Patike",11990,"Crna",28953577,42,"40:2 41:2 42:0 43:0 44:3 45:2","Patike za trening i trčanje sa stabilnom petom i elastičnim prednjim delom."],
  ["SH008","Hrast Chelsea","Muške","Čizme",13990,"Braon",11075617,59,"40:1 41:2 42:2 43:1 44:1","Chelsea čizme od masne kože sa elastičnim umetcima. Obuvaju se bez pertli, drže oblik godinama."],
  ["SH009","Planinar","Muške","Čizme",14990,"Braon",11326180,16,"41:2 42:3 43:2 44:2 45:1","Duboke čizme na pertlanje sa rebrastim đonom. Za blato, kišu i planinske staze."],
  ["SH010","Radna Klasik","Muške","Čizme",12490,"Braon",12095,33,"40:0 41:1 42:2 43:2 44:0","Robusne radne čizme sa ojačanim vrhom i šivenim đonom koji se može menjati."],
  ["SH011","Jesenja Staza","Muške","Čizme",13490,"Braon",20224157,50,"41:1 42:1 43:2 44:1","Gležnjače od brušene kože sa toplom postavom. Za šetnje kroz jesen i blagu zimu."],
  ["SH012","Kamen","Muške","Čizme",11990,"Bež",30272892,7,"42:2 43:3 44:2 45:2","Čizme od nubuka u boji peska, sa debelim đonom i vodoodbojnim premazom."],
  ["SH013","Obala","Muške","Sandale",5490,"Braon",2961991,24,"40:2 41:3 42:3 43:2 44:1","Sandale sa anatomskim uloškom od plute i dva podesiva kaiša."],
  ["SH014","Maslina","Muške","Sandale",5990,"Zelena",26925256,41,"41:2 42:2 43:0 44:1","Kožne sandale u maslinastoj boji sa kontrastnim crnim đonom."],
  ["SH015","Kaldrma","Muške","Sandale",4990,"Braon",15669736,58,"40:1 41:1 42:2 43:2","Sandale sa kaišem oko pete, stabilne za duge šetnje po gradu."],
  ["SH016","Leto Strap","Muške","Sandale",4490,"Bež",31451024,15,"42:3 43:3 44:2","Jednostavne sandale sa mekim kaiševima i laganim đonom."],
  ["SH017","Oksford Mat","Muške","Cipele",12990,"Braon",175689,32,"40:1 41:2 42:2 43:2 44:1 45:1","Oksford cipele od mat kože, zatvoreno pertlanje. Za odelo, venčanje i poslovne sastanke."],
  ["SH018","Gradski Derbi","Muške","Cipele",11990,"Crna",999455,49,"41:2 42:1 43:1 44:0","Derbi cipele od polirane kože sa lakšim gumenim đonom za svakodnevno nošenje."],
  ["SH019","Zanat","Muške","Cipele",14490,"Braon",2562992,6,"41:1 42:1 43:1","Ručno bojena koža i šiven đon. Mala serija, svaka cipela ima blago drugačiju nijansu."],
  ["SH020","Semiš Loafer","Muške","Cipele",10990,"Braon",9427139,23,"40:2 41:2 42:3 43:2 44:1","Mokasine od semiša bez pertli. Mekane od prvog dana, lako se kombinuju."],
  ["SH021","Kancelarija","Muške","Cipele",9990,"Crna",15557052,40,"41:0 42:0 43:0","Klasične crne cipele za posao, sa tankim đonom i zaobljenim vrhom."],
  ["SH022","Bazen Slide","Muške","Papuče",2490,"Crna",14706995,57,"40:4 41:5 42:5 43:4 44:3 45:2","Gumene natikače za bazen, plažu i teretanu. Brzo se suše."],
  ["SH023","Japanke Bazik","Muške","Papuče",1990,"Siva",6910303,14,"41:3 42:3 43:2 44:0","Lagane japanke od mekane gume sa teksturisanim gazištem."],
  ["SH024","Plaža","Muške","Papuče",1490,"Plava",8456247,31,"40:2 42:4 44:2","Šarene japanke za more. Lagane, staju u svaki ranac."],
  ["SH025","Kućni Mir","Muške","Papuče",2990,"Siva",30979631,48,"41:2 42:2 43:3 44:2 45:1","Papuče za kuću sa mekim uloškom i neklizajućim đonom."],
  ["SH026","Oblak","Ženske","Patike",7990,"Bela",27008322,5,"36:2 37:3 38:3 39:1 40:0 41:1","Bele patike sa mekanim đonom i lakim gornjištem. Za ceo dan u gradu."],
  ["SH027","Šetnja","Ženske","Patike",8990,"Bela",27274325,22,"36:1 37:2 38:2 39:2 40:1","Kožne patike sa diskretnim detaljima, udobne i posle deset hiljada koraka."],
  ["SH028","Kutija","Ženske","Patike",8490,"Bela",27204251,39,"37:1 38:0 39:2 40:1","Minimalističke bele patike, ravan đon i glatka koža. Idu uz haljinu i uz farmerke."],
  ["SH029","Ritam","Ženske","Patike",9490,"Crvena",31688982,56,"36:1 37:1 38:2 39:2 40:1 41:0","Patike za trening sa živim detaljima i amortizujućim đonom."],
  ["SH030","Senka","Ženske","Patike",7490,"Bela",21419626,13,"36:2 37:2 38:1 39:0","Svakodnevne patike niskog kroja sa mekim okovratnikom oko skočnog zgloba."],
  ["SH031","Tempo","Ženske","Patike",8990,"Braon",6961151,30,"37:2 38:2 39:1 40:1 41:1","Dvobojne patike u toplim tonovima, sa semiš detaljima."],
  ["SH032","Lagana","Ženske","Patike",6990,"Siva",6685855,47,"36:3 37:3 38:4 39:2 40:2 41:1","Najlakši model u ponudi. Pleteno lice, uložak koji se vadi i pere."],
  ["SH033","Noć","Ženske","Čizme",15990,"Crna",14089760,4,"36:1 37:2 38:2 39:1 40:0","Crne čizme na stabilnoj potpetici od 6 cm. Rajsferšlus sa unutrašnje strane."],
  ["SH034","Tigrica","Ženske","Čizme",17990,"Braon",13684671,21,"37:1 38:1 39:1","Visoke čizme sa animal printom. Model koji nosi celu kombinaciju."],
  ["SH035","Kožna Visoka","Ženske","Čizme",18990,"Braon",27608724,38,"36:1 37:2 38:2 39:2 40:1 41:1","Čizme do kolena od prirodne kože, sa blagom potpeticom i uskom sarom."],
  ["SH036","Karamel","Ženske","Čizme",14990,"Braon",31450738,55,"37:2 38:0 39:2 40:1","Gležnjače u boji karamele sa metalnom kopčom."],
  ["SH037","Kopča","Ženske","Čizme",13990,"Bež",27141845,12,"36:1 37:1 38:2 39:1","Čizme sa dve kopče i širom potpeticom, udobne za ceo radni dan."],
  ["SH038","Leto","Ženske","Sandale",5990,"Plava",8927666,29,"36:2 37:3 38:3 39:2 40:1","Ravne sandale u jakim bojama, sa mekim tekstilnim kaiševima."],
  ["SH039","Remen","Ženske","Sandale",6490,"Braon",26965808,46,"36:1 37:2 38:2 39:0 40:1","Kožne sandale sa kopčama i ravnim đonom. Za more i za grad."],
  ["SH040","Večernja","Ženske","Sandale",8990,"Braon",31450733,3,"37:1 38:1 39:1 40:0","Sandale na tankoj potpetici sa nežnim kaiševima oko skočnog zgloba."],
  ["SH041","Srebrni Sjaj","Ženske","Sandale",9490,"Srebrna",31450737,20,"36:1 37:1 38:2 39:1","Srebrne sandale na potpetici za svečane prilike i duge večeri."],
  ["SH042","Nude Štikla","Ženske","Cipele",10990,"Bež",134064,37,"36:1 37:2 38:2 39:1 40:1","Salonke u boji kože koje optički izdužuju nogu. Potpetica 9 cm."],
  ["SH043","Crni Lak","Ženske","Cipele",11990,"Crna",31450714,54,"36:0 37:1 38:2 39:2 40:1","Lakovane salonke sa špicastim vrhom. Klasika koju svaka garderoba traži."],
  ["SH044","Špic","Ženske","Cipele",12490,"Crna",31450716,11,"37:1 38:1 39:1 40:1","Cipele sa špicastim vrhom i ukrasnom kopčom, na srednjoj potpetici."],
  ["SH045","Konjak","Ženske","Cipele",10490,"Braon",36589768,28,"36:1 37:1 38:2 39:2","Kožne cipele u konjak nijansi na blok potpetici. Stabilne i elegantne."],
  ["SH046","Gala","Ženske","Cipele",12990,"Crna",17641802,45,"36:1 37:1 38:1 39:0 40:0","Visoke štikle za večernje izlaske. Mekani uložak ispod prstiju."],
  ["SH047","Ružičasti Oblak","Ženske","Papuče",2990,"Roze",1444417,2,"36:3 37:3 38:4 39:3 40:2","Pufnaste papuče za kuću. Tople, mekane i tihe na parketu."],
  ["SH048","Mekani Korak","Ženske","Papuče",2490,"Roze",8568926,19,"37:2 38:2 39:2 40:1","Zatvorene papuče sa memorijskom penom i gumenim đonom."],
  ["SH049","Krzno","Ženske","Papuče",3490,"Bež",12969102,36,"36:0 37:0 38:0 39:0","Papuče od veštačkog krzna sa čvrstim đonom, mogu i do prodavnice."],
  ["SH050","Zimski Mir","Ženske","Papuče",2790,"Siva",8090987,53,"36:2 37:2 38:3 39:2 40:1 41:1","Tople papuče sa krznenim uloškom za hladne zimske večeri."]
  ];
  return function () {
    return ROWS.map(function (r) {
      const stock = {};
      r[8].split(' ').forEach(function (pair) { const x = pair.split(':'); stock[x[0]] = Number(x[1]); });
      const sizes = Object.keys(stock).map(Number).sort(function (a, b) { return a - b; });
      return {
        id: r[0], name: r[1], gender: r[2], category: r[3], price: r[4], color: r[5],
        image: 'https://images.pexels.com/photos/' + r[6] + '/pexels-photo-' + r[6] + '.jpeg?auto=compress&cs=tinysrgb&w=800',
        createdAt: new Date(Date.now() - r[7] * 86400000).toISOString(),
        status: 'aktivan', description: r[9], sizes: sizes, stock: stock
      };
    });
  };
})();
