import type { Guide } from "./types";

// =============================================================================
// /guias — long-form buying guides for TirePro Marketplace.
//
// Each entry is one decision the user is about to make with money on the line.
// Content is Colombian Spanish, direct second-person voice, no marketing fluff.
// =============================================================================

export const GUIDES: Guide[] = [
  // ---------------------------------------------------------------------------
  // 1. Cómo elegir llantas para tractomula
  // ---------------------------------------------------------------------------
  {
    slug: "como-elegir-llantas-para-tractomula",
    title: "Cómo elegir llantas para tractomula",
    category: "flota",
    readMinutes: 10,
    updatedDate: "2026-05-06",
    shortDescription:
      "Guía técnica para elegir llantas de tractomula por posición de eje, dimensión, índice de carga y decisión nueva vs reencauche en Colombia.",
    intro:
      "Comprar llantas para tractomula no es una sola decisión: son tres o cuatro decisiones distintas, una por cada posición de eje. Lo que pones en la dirección no es lo mismo que pones en tracción, y lo que va en el remolque casi nunca debería ser una llanta nueva premium. Esta guía te ayuda a configurar el set completo de un cabezote 6x4 con remolque, optimizando costo por kilómetro (CPK) sin sacrificar seguridad.",
    sections: [
      {
        heading: "Posición de eje: la decisión que más impacta el costo",
        paragraphs: [
          "Una tractomula típica en Colombia (configuración 6x4 con remolque de tres ejes) lleva entre 18 y 22 llantas. La trampa más común del transportador novato es comprar el mismo modelo para todo el equipo: termina pagando llantas premium para una posición que no las necesita y económicas para una posición que sí.",
          "El eje direccional (delantero) carga menos peso pero soporta toda la fuerza de giro y debe entregar respuesta precisa. Aquí es donde una llanta premium —Michelin XZE2+, Bridgestone R268 o Continental HDR2— se justifica: durabilidad de banda alta, flanco resistente a impactos laterales y, sobre todo, un casco que aguanta 2 o 3 reencauches después.",
          "El eje de tracción (las dos parejas duales del cabezote) recibe el torque del motor y se desgasta de forma agresiva. Aquí necesitas un dibujo profundo tipo lug —Michelin XDE2+, Bridgestone M729 o Goodyear G622 RSD— y un compuesto pensado para tracción, no para milage puro. En remolque, en cambio, casi nunca compres llanta nueva premium: el reencauche bien hecho rinde el 80% del kilometraje a la mitad del precio.",
        ],
      },
      {
        heading: "Dimensiones y configuraciones más usadas en el país",
        paragraphs: [
          "Las dos dimensiones que dominan el parque de carga colombiano son la 295/80R22.5 y la 11R22.5. La 295/80R22.5 es la más común en cabezotes nuevos importados desde 2015 en adelante: ofrece mejor huella, aguanta carga alta y tiene buena disponibilidad de reencauche. La 11R22.5 sigue presente en flotas más antiguas y en algunos remolques; es más alta y más estrecha, con buen comportamiento en carretera destapada.",
          "También verás 315/80R22.5 (más ancha, usada en cabezotes pesados o configuraciones 8x4) y 12R22.5 en aplicaciones específicas. La regla práctica: nunca mezcles dimensiones distintas en el mismo eje y, si vas a cambiar de dimensión, verifica que el rin lo permita y que el espacio del guardafango lo aguante con la suspensión comprimida.",
          "Si compras en TirePro Marketplace, filtra por categoría tractomula y la dimensión exacta. No te dejes confundir por equivalencias aproximadas: una 295/75R22.5 y una 295/80R22.5 no son intercambiables aunque parezcan similares.",
        ],
      },
      {
        heading: "Índice de carga: el número que no puedes negociar",
        paragraphs: [
          "El índice de carga te dice cuánto peso aguanta una llanta a la presión recomendada. En tractomula, los índices típicos van de 152/148 a 156/153 (el primer número es para uso simple, el segundo para uso dual). Un 152 simple significa 3.550 kg por llanta; un 156 simple, 4.000 kg.",
          "Calcula el peso por llanta dividiendo el peso bruto del vehículo cargado entre el número de llantas que lo soportan. Si tu cabezote más remolque va con 50.000 kg de peso bruto y lleva 22 llantas, cada llanta carga aproximadamente 2.270 kg —pero en la práctica el reparto no es igual: el eje de tracción suele cargar 30% más que el promedio.",
          "Nunca compres una llanta con índice por debajo del especificado en la placa del fabricante. La diferencia entre un 148 y un 152 puede parecer pequeña, pero a 90 km/h con sobrecarga, el flanco trabaja al límite y un impacto contra un hueco saca la llanta del servicio en segundos.",
        ],
      },
      {
        heading: "Premium vs económica: la matriz que sí funciona",
        paragraphs: [
          "Las marcas premium (Michelin, Bridgestone, Continental, Goodyear) entregan más kilómetros, mejor casco para reencauche y soporte técnico real. Su precio inicial está entre 1,8 y 2,3 millones por llanta nueva 295/80R22.5, pero el casco aguanta 2 o 3 reencauches, lo que baja el CPK total a 80–110 pesos por kilómetro en flotas bien gestionadas.",
          "Las marcas asiáticas serias (Hankook, Sailun, Triangle, Linglong) cuestan entre 1,1 y 1,5 millones. Hankook es la más cercana al estándar premium en kilometraje; Sailun y Triangle dan buen valor en remolque y aplicaciones de baja exigencia; Linglong rinde menos pero compite agresivo en precio. La regla empírica: si tu ruta es larga y plana (Bogotá–Cartagena, Bogotá–Cali), premium se paga sola en 60.000 km. Si tu ruta es corta y montañosa con muchas paradas, la económica con buen reencauche puede ganar.",
          "El error más caro es comprar premium para el remolque. El remolque no transmite torque, no gira, no frena con la misma exigencia: una llanta reencauchada de buen casco rinde igual a una nueva económica, a menos del 50% del costo.",
        ],
      },
      {
        heading: "Nuevas vs reencauche: matriz por eje",
        paragraphs: [
          "Eje direccional: siempre llanta nueva. Es la única posición donde la falla compromete la dirección del vehículo. Compra premium o asiática top, pero nueva.",
          "Eje de tracción: nueva en el primer ciclo de vida del casco; reencauche profundo (lug pattern) a partir del segundo ciclo, siempre y cuando el casco haya pasado inspección por shearografía y el RTD remanente al retiro haya sido al menos 3 mm.",
          "Eje de remolque: reencauche desde el segundo ciclo. Los remolques en Colombia rinden perfectamente con reencauche libre o de remolque, especialmente en rutas pavimentadas. Si tu reencauchadora es seria —Vipal, Bandag, Marangoni— el resultado es indistinguible de una nueva económica.",
        ],
      },
    ],
    howToSteps: [
      {
        name: "Inventaría el equipo y mapea posiciones",
        text: "Lista cada posición del cabezote y remolque con su dimensión actual, marca, RTD y kilometraje. Sin este mapa no puedes optimizar nada.",
      },
      {
        name: "Calcula el peso por llanta",
        text: "Divide el peso bruto operacional entre el número de llantas y aplica un factor de 1,3 al eje de tracción para definir el índice de carga mínimo.",
      },
      {
        name: "Define la marca por posición",
        text: "Premium en dirección, premium o asiática top en tracción, asiática o reencauche en remolque. No mezcles marcas dentro del mismo eje.",
      },
      {
        name: "Verifica disponibilidad de reencauche del casco",
        text: "Antes de comprar, confirma que la marca elegida tiene casco reencauchable certificado por al menos una reencauchadora reconocida en Colombia.",
      },
      {
        name: "Negocia precio por set, no por unidad",
        text: "Las distribuidoras serias dan descuento de volumen a partir de 6 llantas. Cotiza el set completo (cabezote + remolque) en una sola compra.",
      },
      {
        name: "Registra fecha DOT y posición de instalación",
        text: "Anota la semana DOT y la posición exacta donde se montó cada llanta. Esto es la base de cualquier cálculo de CPK posterior.",
      },
      {
        name: "Programa la primera rotación",
        text: "Define desde el día uno cuándo será la primera rotación entre tracción y remolque (típicamente entre 40.000 y 60.000 km).",
      },
    ],
    faqs: [
      {
        q: "¿Puedo poner una llanta de tracción en el eje direccional?",
        a: "No. Los dibujos de tracción tipo lug generan ruido, vibración y respuesta de dirección imprecisa en el eje delantero. Además, su flanco está diseñado para aguantar torque, no para la fuerza lateral del giro. Usa siempre una llanta de dirección (rib pattern) en el eje delantero.",
      },
      {
        q: "¿Cuántos kilómetros debe rendir una llanta de tractomula?",
        a: "En Colombia, una llanta premium en eje direccional rinde 120.000–160.000 km hasta el primer retiro. En tracción, 80.000–110.000 km. En remolque, 100.000–140.000 km. Las marcas asiáticas top rinden aproximadamente 70–80% de esos números.",
      },
      {
        q: "¿Vale la pena comprar Michelin para todo el equipo?",
        a: "Solo si operas rutas largas, planas y de alto kilometraje mensual (más de 15.000 km/mes por vehículo). En operaciones cortas o muy montañosas, mezclar Michelin en dirección con asiática en tracción y reencauche en remolque suele dar mejor CPK total.",
      },
      {
        q: "¿Cómo sé si el casco aguanta otro reencauche?",
        a: "Lo decide la reencauchadora con shearografía e inspección visual. Como dueño, mira el RTD al retiro (mínimo 2 mm de profundidad), busca cortes profundos en el flanco, separaciones del cinturón y daños por sobrecarga. Si tienes dudas, retira la llanta antes de que el casco se dañe.",
      },
      {
        q: "¿Puedo mezclar marcas en el mismo eje?",
        a: "Técnicamente puedes, pero no es buena idea. Distintas marcas tienen distintas circunferencias y rigideces, lo que genera desgaste irregular y problemas de balanceo. Si vas a mezclar, hazlo entre ejes distintos, no dentro del mismo eje.",
      },
      {
        q: "¿Qué presión manejo en cada posición?",
        a: "Como referencia: dirección 110–120 psi, tracción 100–110 psi, remolque 100–110 psi. La cifra exacta depende del peso real cargado y la dimensión. Consulta la tabla de carga del fabricante o la guía de presión por vehículo de TirePro.",
      },
    ],
    relatedTerms: [
      "llanta-de-tractomula",
      "indice-de-carga",
      "reencauche",
      "cpk",
      "casco-de-la-llanta",
    ],
    marketplaceLinks: [
      { label: "Llantas para tractomula", href: "/marketplace/categoria/tractomula" },
      { label: "Llantas reencauchadas", href: "/marketplace/categoria/reencauche" },
      { label: "Comparar marcas premium", href: "/marketplace/comparar" },
      { label: "Calculadora de CPK", href: "/calculadora" },
    ],
    relatedGuides: [
      "cuando-conviene-reencauchar-llantas",
      "como-calcular-cpk",
      "llantas-premium-vs-economicas",
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. Cuándo conviene reencauchar tus llantas
  // ---------------------------------------------------------------------------
  {
    slug: "cuando-conviene-reencauchar-llantas",
    title: "Cuándo conviene reencauchar tus llantas",
    category: "flota",
    readMinutes: 9,
    updatedDate: "2026-05-06",
    shortDescription:
      "Cuándo el reencauche te ahorra plata, cuándo no, y cómo evaluar el casco para decidir entre una segunda vida o el retiro definitivo.",
    intro:
      "El reencauche es la decisión que separa una flota rentable de una flota que está quemando dinero. Bien hecho, baja el CPK entre 30% y 45%; mal hecho, te deja varado en la mitad del Magdalena. La pregunta real no es '¿reencauche sí o no?', sino '¿este casco específico aguanta otro ciclo, y vale la pena el riesgo en mi operación?'. Esta guía te da los criterios técnicos y de negocio para decidir.",
    sections: [
      {
        heading: "Estado del casco: lo que la reencauchadora mira primero",
        paragraphs: [
          "El casco es la estructura interna de la llanta: cinturones de acero, capa textil y talón. Cuando reencauchas, todo lo que cambia es la banda de rodamiento; el casco es el mismo. Por eso, la calidad del casco a la entrada decide la calidad del producto a la salida.",
          "Las reencauchadoras serias (Vipal, Bandag, Marangoni, Recauchadora Andina) hacen tres pasos antes de aceptar un casco: inspección visual, shearografía (escaneo de separaciones internas) y prueba de presión. Un casco con cortes pasantes en el flanco, separaciones del cinturón mayores a 5 cm o evidencia de rodaje desinflado se rechaza, y debe rechazarse.",
          "Como dueño, antes de mandar a reencauchar revisa: que no haya alambres expuestos, que el flanco no tenga abultamientos (ampollas internas), que no haya parches mal hechos en el corona, y que el RTD remanente no sea inferior a 2 mm —si llegó a la lona, el casco probablemente está dañado por calor.",
        ],
      },
      {
        heading: "RTD mínimo de retiro: el momento exacto de bajar la llanta",
        paragraphs: [
          "El RTD (remaining tread depth, profundidad de banda remanente) es el indicador clave para retirar una llanta antes de que el casco se dañe. La regla en Colombia: retira a 3 mm si vas a reencauchar, retira a 1,6 mm (mínimo legal) si la vas a desechar.",
          "La razón es simple: por debajo de 3 mm, el calor que se acumula en el caucho remanente empieza a degradar el cinturón de acero. Una llanta corrida 'hasta la lona' rara vez califica para reencauche; aunque pase la inspección visual, su vida útil reencauchada será corta.",
          "En la práctica, programa la rotación o el retiro cuando midas 4 mm en el punto más desgastado. Esto te deja margen para coordinar el envío a la reencauchadora sin sacar el vehículo de servicio inesperadamente.",
        ],
      },
      {
        heading: "Cuántas veces puedes reencauchar la misma llanta",
        paragraphs: [
          "Depende del casco. Una Michelin o Bridgestone premium en buen estado aguanta 2 o 3 reencauches: significa que la misma carcasa rinde 3 o 4 ciclos de banda. Una Continental o Goodyear premium, similar. Las marcas asiáticas top (Hankook, Sailun) suelen aguantar 1 o 2 reencauches con buen resultado; Triangle y Linglong, típicamente 1.",
          "Cada ciclo subsecuente entrega menos kilometraje que el anterior: el primer reencauche rinde 80–90% de una llanta nueva equivalente; el segundo, 65–75%; el tercero, 50–60%. La economía sigue siendo positiva, pero el margen se va estrechando.",
          "Lleva un registro por número de serie: cuántos reencauches lleva, qué reencauchadora hizo cada uno, y cuántos kilómetros rindió. Sin este registro, la decisión de reencauchar otra vez es a ciegas.",
        ],
      },
      {
        heading: "Ahorro CPK típico en Colombia",
        paragraphs: [
          "Una llanta nueva premium para tractomula cuesta 2,0–2,3 millones y rinde 100.000 km en tracción. CPK base: 20–23 pesos por kilómetro solo en costo de llanta.",
          "Esa misma llanta, reencauchada, cuesta 700.000–900.000 pesos y rinde 70.000–85.000 km en remolque. CPK del segundo ciclo: 9–13 pesos por kilómetro. La caída es del 40–55%.",
          "Suma el CPK ponderado de los dos ciclos y obtienes 14–17 pesos por kilómetro versus 22 pesos si solo usaras llantas nuevas. En una flota de 10 cabezotes con 22 llantas cada uno corriendo 200.000 km/año, esa diferencia son 100–140 millones de pesos al año.",
        ],
      },
      {
        heading: "Cuándo NO reencauchar (aunque el casco esté bueno)",
        paragraphs: [
          "Hay casos donde el reencauche, aun siendo técnicamente posible, no es buen negocio. Primero: eje direccional. La falla en dirección compromete la seguridad del conductor de forma directa; siempre llanta nueva.",
          "Segundo: operación de pasajeros (buses intermunicipales, escolares). La normativa y el riesgo reputacional pesan más que el ahorro. Algunas operadoras serias permiten reencauche solo en eje trasero y solo con cascos de menos de 4 años.",
          "Tercero: cascos con más de 5 años de fabricación (mira el DOT). Aunque visualmente estén bien, el caucho del casco se endurece y pierde adherencia. Cuarto: rutas con mucho calor sostenido (Llanos, Magdalena Medio en verano) en las que el reencauche acumula falla por temperatura más rápido. Quinto: cuando el reencauche representa más del 60% del precio de una llanta nueva económica equivalente; en ese punto, la nueva económica suele ganar.",
        ],
      },
    ],
    faqs: [
      {
        q: "¿El reencauche es seguro?",
        a: "Sí, cuando lo hace una reencauchadora certificada con casco bien inspeccionado. La industria de aviación comercial usa reencauche como práctica estándar. El problema es el reencauche barato e informal, donde se aceptan cascos que deberían rechazarse.",
      },
      {
        q: "¿Cómo identifico una reencauchadora seria?",
        a: "Pide ver el equipo de shearografía, exige certificación del proceso (Vipal, Bandag, Marangoni son licencias internacionales reconocidas), pregunta por la garantía sobre el reencauche (mínimo 6 meses o 30.000 km) y pide referencias de flotas grandes que les compren regularmente.",
      },
      {
        q: "¿Puedo reencauchar llantas de mi camioneta o carro?",
        a: "Técnicamente sí, pero el mercado colombiano de reencauche para llantas de pasajero (rin 16, 17, 18) es muy limitado y los costos no compensan. El reencauche es un negocio para llantas de aro 22.5 en adelante (camión, bus, tractomula).",
      },
      {
        q: "¿Cuánto tarda un reencauche?",
        a: "Entre 7 y 14 días desde que entregas el casco hasta que recibes la llanta lista. Programa con anticipación si necesitas mantener la flota en operación.",
      },
      {
        q: "¿Cómo sé que la llanta reencauchada que compro es buena?",
        a: "Verifica que tenga sello de la reencauchadora con número de serie, fecha de proceso, marca de banda aplicada (Bandag BDR, Vipal VT) y garantía escrita. Sin estos cuatro elementos, no compres.",
      },
      {
        q: "¿El reencauche aguanta velocidad?",
        a: "Una llanta reencauchada bien hecha está homologada para velocidades de hasta 100 km/h en aplicación de carga. Para vehículos de pasajeros largos recorridos donde se sostienen 110–120 km/h, prefiere llanta nueva.",
      },
    ],
    relatedTerms: [
      "reencauche",
      "casco-de-la-llanta",
      "rtd",
      "cpk",
      "comparativa-nueva-vs-reencauche",
    ],
    marketplaceLinks: [
      { label: "Catálogo de reencauche", href: "/marketplace/categoria/reencauche" },
      { label: "Llantas nuevas para tractomula", href: "/marketplace/categoria/tractomula" },
      { label: "Calculadora de CPK", href: "/calculadora" },
    ],
    relatedGuides: [
      "llanta-nueva-vs-reencauche",
      "como-calcular-cpk",
      "como-elegir-llantas-para-tractomula",
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. Llanta nueva vs reencauche: cuál elegir
  // ---------------------------------------------------------------------------
  {
    slug: "llanta-nueva-vs-reencauche",
    title: "Llanta nueva vs reencauche: cuál elegir",
    category: "compra",
    readMinutes: 8,
    updatedDate: "2026-05-06",
    shortDescription:
      "Comparación honesta entre llanta nueva y reencauche: kilometraje, costo, seguridad, y la matriz de decisión según tu aplicación.",
    intro:
      "La pelea entre llanta nueva y reencauche está llena de mitos: que el reencauche se 'vuela', que la nueva siempre rinde más, que la asiática nueva es mejor que cualquier reencauche premium. Ninguna de esas afirmaciones es cierta como regla general. La respuesta correcta depende de la posición, la marca del casco, la reencauchadora y la operación. Aquí va la comparación lado a lado, sin sesgos comerciales.",
    sections: [
      {
        heading: "Comparación lado a lado",
        paragraphs: [
          "Costo inicial: una llanta nueva premium 295/80R22.5 cuesta entre 2,0 y 2,3 millones; una asiática top, 1,1–1,5 millones; un reencauche profundo de buen casco premium, 700.000–900.000 pesos. La diferencia de precio entre nueva premium y reencauche es del 60–65%.",
          "Kilometraje: la nueva premium en tracción rinde 90.000–110.000 km; la asiática top, 65.000–85.000 km; el reencauche premium, 70.000–85.000 km en remolque y 50.000–65.000 km en tracción. Es decir, el reencauche rinde aproximadamente 75–80% de una llanta nueva equivalente, a la mitad del precio.",
          "CPK puro de llanta: nueva premium 22 pesos/km, asiática top 18 pesos/km, reencauche premium 11 pesos/km. El reencauche bien hecho gana en CPK casi siempre. Donde pierde es en horas de servicio (programación, riesgo de calidad de la reencauchadora) y en posiciones críticas como el direccional.",
        ],
      },
      {
        heading: "Decisión por aplicación",
        paragraphs: [
          "Tractomula con ruta larga y plana (Bogotá–Costa, Bogotá–Cali): nueva premium en dirección y tracción durante el primer ciclo; reencauche en remolque desde el inicio y en tracción a partir del segundo ciclo. Esta es la matriz que usan las flotas grandes (Coordinadora, Servientrega, TCC).",
          "Camión rígido urbano y de reparto (mensajería, distribución): asiática top nueva en todas las posiciones puede ser la mejor jugada, porque el kilometraje anual es bajo (60.000–80.000 km) y el costo del proceso de reencauche es alto en relación al ahorro absoluto.",
          "Bus intermunicipal: nueva siempre. La normativa y el riesgo de pasajeros pesan más que el ahorro de CPK. Algunas operadoras hacen reencauche solo en eje trasero y solo con cascos de menos de 4 años. Bus urbano: aplica la lógica de tractomula reducida —nueva en dirección, reencauche en tracción a partir del segundo ciclo.",
          "Camioneta y carro particular: siempre llanta nueva. El mercado de reencauche para aro 16–18 es marginal en Colombia, los costos no compensan y la oferta seria es limitada.",
        ],
      },
      {
        heading: "Mitos comunes que cuestan plata",
        paragraphs: [
          "Mito 1: 'el reencauche se vuela en carretera'. Falso si el casco fue inspeccionado y la reencauchadora es seria. Lo que se vuela son llantas con casco fatigado que nunca debieron reencaucharse, o reencauches informales sin shearografía.",
          "Mito 2: 'la asiática nueva siempre es mejor que el reencauche premium'. Falso. Un reencauche Bandag sobre casco Michelin aguanta más que una Linglong nueva en remolque. La calidad del casco original importa más que el origen del caucho de banda.",
          "Mito 3: 'reencauchar pierde la garantía de la marca original'. Cierto en parte: pierdes la garantía de la marca de la llanta original, pero ganas la garantía de la reencauchadora sobre el proceso. La buena reencauchadora cubre el casco si el proceso falla.",
          "Mito 4: 'es más seguro comprar nuevo siempre'. Solo si comparas premium con reencauche informal. Premium reencauchada en planta certificada es más segura que asiática nueva de marca desconocida.",
        ],
      },
      {
        heading: "Casos reales: cuándo cada opción gana",
        paragraphs: [
          "Caso A — Flota de 30 tractomulas, ruta Costa-Interior, 250.000 km/año por unidad. Mejor jugada: nueva premium en dirección, mezcla nueva premium / asiática top en tracción primer ciclo, reencauche premium en remolque y segundo ciclo de tracción. Ahorro estimado vs todo nuevo: 35% en CPK total.",
          "Caso B — Camión 4x2 de distribución urbana, 70.000 km/año. Mejor jugada: nueva asiática top en todas las posiciones; el reencauche no compensa el costo del proceso a ese kilometraje anual.",
          "Caso C — Camioneta 4x4 personal, 18.000 km/año. Mejor jugada: nueva siempre, marca asiática top o premium según presupuesto. El reencauche no es opción real en este segmento.",
        ],
      },
    ],
    faqs: [
      {
        q: "¿En qué posiciones nunca debo poner reencauche?",
        a: "En el eje direccional de cualquier vehículo de carga o pasajeros, y en cualquier posición de un vehículo particular liviano. En estos casos, siempre llanta nueva.",
      },
      {
        q: "¿El reencauche aguanta lluvia y carretera mojada?",
        a: "Sí, el dibujo de un reencauche profundo evacúa agua igual que una llanta nueva con el mismo dibujo. El problema con lluvia aparece cuando el reencauche está en su última fase de vida útil y el RTD bajó.",
      },
      {
        q: "¿Cuánto debe ahorrar un reencauche para que valga la pena?",
        a: "Como regla, el reencauche debe costar menos del 50% de una llanta nueva equivalente para que la economía funcione. Si la diferencia es menor al 40%, prefiere la nueva.",
      },
      {
        q: "¿Se nota la diferencia al manejar entre nueva y reencauche?",
        a: "En un cabezote o camión, prácticamente no. En posiciones de remolque, ninguna diferencia perceptible. La diferencia se nota en duración total, no en feel de manejo.",
      },
      {
        q: "¿Puedo combinar nuevas y reencauches en el mismo vehículo?",
        a: "Sí, y es la práctica estándar. Lo que no debes hacer es combinarlas dentro del mismo eje: cada eje debe tener llantas con la misma circunferencia y rigidez.",
      },
    ],
    relatedTerms: [
      "comparativa-nueva-vs-reencauche",
      "reencauche",
      "cpk",
      "casco-de-la-llanta",
      "vida-util-de-llanta",
    ],
    marketplaceLinks: [
      { label: "Llantas nuevas", href: "/marketplace/categoria/nueva" },
      { label: "Llantas reencauchadas", href: "/marketplace/categoria/reencauche" },
      { label: "Comparar marcas", href: "/marketplace/comparar" },
    ],
    relatedGuides: [
      "cuando-conviene-reencauchar-llantas",
      "como-calcular-cpk",
      "llantas-premium-vs-economicas",
    ],
  },

  // ---------------------------------------------------------------------------
  // 4. Cómo leer la dimensión de una llanta
  // ---------------------------------------------------------------------------
  {
    slug: "como-leer-dimension-llanta",
    title: "Cómo leer la dimensión de una llanta",
    category: "compra",
    readMinutes: 6,
    updatedDate: "2026-05-06",
    shortDescription:
      "Decodifica paso a paso una marcación tipo 205/55R16 91V: ancho, perfil, construcción, rin, índice de carga e índice de velocidad.",
    intro:
      "El número impreso en el flanco de tu llanta —algo como 205/55R16 91V— es una ficha técnica completa. Te dice qué tan ancha es, qué tan alta, cómo está construida, qué rin necesita, cuánto peso aguanta y a qué velocidad. Saber leerlo es la diferencia entre comprar la llanta correcta y descubrir, con la llanta ya pagada, que no encaja en tu vehículo. Esta guía te decodifica cada elemento.",
    sections: [
      {
        heading: "El ejemplo que vamos a usar: 205/55R16 91V",
        paragraphs: [
          "Esta es una marcación típica de carro mediano —Mazda 3, Renault Logan equipado, Hyundai i25—. Cada parte tiene un significado preciso, y todas juntas describen la geometría y la capacidad de la llanta.",
          "Vamos a ir descomponiendo de izquierda a derecha: 205, 55, R, 16, 91, V. Cuando termines la lectura sabrás traducir cualquier marcación de llanta de pasajero, camioneta y casi cualquier llanta comercial radial.",
        ],
      },
      {
        heading: "205: ancho de sección en milímetros",
        paragraphs: [
          "El primer número es el ancho de la llanta medido en milímetros, de flanco a flanco, cuando está montada y a presión nominal. 205 mm es un ancho típico de carro compacto. 245 mm ya es camioneta mediana, 285 mm camioneta grande o deportivo, y 295 o 315 mm tractomula.",
          "Una llanta más ancha entrega más huella de contacto, mejor agarre en seco y mayor capacidad de carga, pero también más consumo de combustible y más sensibilidad al hidroplaneo si el dibujo no está bien diseñado.",
        ],
      },
      {
        heading: "55: aspecto (relación entre alto del flanco y ancho)",
        paragraphs: [
          "El segundo número es el aspecto, expresado como porcentaje. Un 55 significa que el flanco mide 55% del ancho. En este caso: 205 × 0,55 = 113 mm de altura de flanco.",
          "Aspectos comunes: 80 y 75 son llantas de camioneta vieja o tractomula con flanco alto y comportamiento blando; 65 y 60 son típicos de camioneta moderna; 55 y 50 son de carro deportivo o sedán mediano; 45, 40 y 35 son llantas de bajo perfil deportivas, con respuesta directa pero sensibles al hueco.",
          "Bajar de aspecto sin cambiar otros parámetros endurece la conducción y aumenta el riesgo de daño en flanco. Subir de aspecto suaviza pero ralentiza la respuesta de dirección.",
        ],
      },
      {
        heading: "R: tipo de construcción (radial)",
        paragraphs: [
          "La letra entre el aspecto y el rin indica el tipo de construcción. R = radial (la norma desde los años 90 para todo vehículo de pasajero y comercial moderno). D = diagonal (bias-ply, todavía usada en algunas llantas industriales y agrícolas). B = bias-belted (rara, prácticamente extinta).",
          "Una llanta diagonal tiene los cinturones en ángulo cruzado; una radial los tiene perpendiculares al sentido de marcha más cinturones de acero. La radial entrega menor resistencia al rodaje, mayor durabilidad y mejor disipación de calor, por eso desplazó a la diagonal en casi todas las aplicaciones.",
        ],
      },
      {
        heading: "16: diámetro del rin en pulgadas",
        paragraphs: [
          "El número después de la R es el diámetro interior de la llanta, que debe coincidir exactamente con el diámetro del rin. Se mide en pulgadas, no en centímetros, por convención histórica.",
          "Rines comunes en Colombia: 13, 14, 15 (carros antiguos y compactos), 16, 17 (sedán y camioneta media), 18, 19, 20 (camioneta moderna y SUV grande), 22.5 (camión, bus, tractomula).",
          "Nunca compres una llanta con diámetro distinto al de tu rin. No es 'compatible aproximada': sencillamente no monta o monta mal y se sale a velocidad.",
        ],
      },
      {
        heading: "91V: índice de carga e índice de velocidad",
        paragraphs: [
          "El número final (91 en este caso) es el índice de carga. Cada número corresponde a un peso máximo según una tabla estándar: 91 = 615 kg por llanta. Para tu vehículo, multiplica por 4 y compáralo con el peso bruto admisible.",
          "La letra (V en este caso) es el índice de velocidad: la velocidad máxima sostenida que la llanta aguanta a su carga máxima. T = 190 km/h, H = 210 km/h, V = 240 km/h, W = 270 km/h, Y = 300 km/h.",
          "Nunca bajes el índice de velocidad respecto al original del vehículo, aunque tú nunca vayas a esas velocidades: el índice también refleja la calidad estructural de la llanta. Bajar el índice de carga es directamente peligroso.",
        ],
      },
    ],
    howToSteps: [
      {
        name: "Localiza la marcación en el flanco",
        text: "Busca en el flanco exterior de la llanta un grupo de números y letras del estilo 205/55R16 91V. Suele estar resaltado en relieve.",
      },
      {
        name: "Identifica el ancho de sección",
        text: "El primer número (antes de la barra) es el ancho en milímetros. Anótalo.",
      },
      {
        name: "Identifica el aspecto",
        text: "El segundo número (después de la barra, antes de la letra) es el aspecto en porcentaje. Multiplica ancho × aspecto/100 para obtener el alto del flanco.",
      },
      {
        name: "Verifica construcción y rin",
        text: "La letra (R, D, B) es la construcción. El número siguiente es el diámetro del rin en pulgadas. Confirma que coincide con tu rin actual.",
      },
      {
        name: "Lee el índice de carga y velocidad",
        text: "El número y la letra finales son índice de carga e índice de velocidad. Compáralos con los originales de tu vehículo —deben ser iguales o superiores.",
      },
    ],
    faqs: [
      {
        q: "¿Dónde encuentro la dimensión recomendada por el fabricante de mi vehículo?",
        a: "En la placa de la puerta del conductor (lado interno) o en el manual del propietario. Esa es la referencia oficial; lo que está en la llanta actual puede o no coincidir, dependiendo de si alguien cambió la dimensión antes.",
      },
      {
        q: "¿Puedo cambiar la dimensión de mis llantas?",
        a: "Solo con equivalencias que mantengan la circunferencia total dentro de un margen de ±3% y respeten el espacio del guardafango. Cambiar dimensión sin asesoría afecta velocímetro, ABS y a veces hasta el control electrónico de estabilidad.",
      },
      {
        q: "¿Qué significa la letra LT antes de la dimensión?",
        a: "LT = Light Truck (camioneta de carga liviana). Indica que la llanta está construida para mayor capacidad de carga que una llanta de pasajero del mismo tamaño. No es intercambiable a la ligera con una llanta de pasajero (P).",
      },
      {
        q: "¿Y la C, ¿qué quiere decir?",
        a: "C = Commercial. Llantas para vehículos comerciales ligeros (camionetas de reparto, vans). Tienen índice de carga reforzado. Si tu camioneta vino con C, no la reemplaces por una P sin verificar carga.",
      },
      {
        q: "¿Qué es el 'aspecto' en pocas palabras?",
        a: "Es qué tan alto es el flanco respecto al ancho. Aspecto bajo = perfil bajo = manejo deportivo y rines más grandes. Aspecto alto = flanco grueso = más comodidad y resistencia a huecos.",
      },
      {
        q: "¿La marcación DOT es lo mismo que la dimensión?",
        a: "No. DOT es la fecha de fabricación y origen, en otra zona del flanco. La dimensión es la ficha técnica de tamaño y carga.",
      },
    ],
    relatedTerms: [
      "dimension-llanta",
      "aspecto",
      "indice-de-carga",
      "indice-de-velocidad",
      "llanta-radial",
    ],
    marketplaceLinks: [
      { label: "Buscar por dimensión", href: "/marketplace" },
      { label: "Llantas de auto", href: "/marketplace/categoria/auto" },
      { label: "Llantas de camioneta", href: "/marketplace/categoria/camioneta" },
    ],
    relatedGuides: [
      "como-elegir-llantas-camioneta",
      "guia-presion-inflado-llantas",
    ],
  },

  // ---------------------------------------------------------------------------
  // 5. Cómo elegir llantas para camioneta y SUV
  // ---------------------------------------------------------------------------
  {
    slug: "como-elegir-llantas-camioneta",
    title: "Cómo elegir llantas para camioneta y SUV",
    category: "compra",
    readMinutes: 8,
    updatedDate: "2026-05-06",
    shortDescription:
      "H/T, A/T o M/T: cómo elegir la llanta correcta para tu camioneta o SUV según uso real (pavimento, mixto, off-road) y dimensión.",
    intro:
      "Comprar llantas para camioneta o SUV es donde más fácil te equivocas: la llanta gruesa con tacos agresivos se ve increíble en el carro, pero si manejas 80% en pavimento te vas a arrepentir el primer mes. La pregunta correcta no es '¿qué llanta se ve mejor?', sino '¿qué porcentaje real de mi uso es destapado, lluvia, lodo o nieve?'. Con esa respuesta, la elección entre H/T, A/T y M/T es directa.",
    sections: [
      {
        heading: "H/T, A/T o M/T: las tres familias y para qué son",
        paragraphs: [
          "H/T (Highway Terrain) es la llanta de pavimento. Dibujo cerrado tipo carro, banda de rodamiento orientada a kilometraje, ruido y consumo. Modelos típicos: Michelin Defender LTX, Bridgestone Dueler H/T, Continental CrossContact H/T, Goodyear Wrangler HT. Es la elección correcta si tu uso es 90% asfalto y 10% destapada esporádica.",
          "A/T (All Terrain) es la llanta intermedia: dibujo más abierto que H/T pero todavía rodable cómodo en pavimento. Aguanta destapada, lodo moderado, piedra suelta y nieve ligera. Modelos típicos: BFGoodrich All-Terrain T/A KO2, Goodyear Wrangler AT Adventure, Continental CrossContact AT, Hankook Dynapro AT2. Elección correcta para uso 60/40 o 50/50 entre pavimento y destapada.",
          "M/T (Mud Terrain) es la llanta agresiva: tacos profundos y separados pensados para lodo, roca, arena y nieve profunda. Modelos típicos: BFGoodrich Mud-Terrain T/A KM3, Toyo Open Country M/T, Mickey Thompson Baja MTZ. En pavimento es ruidosa, consume más combustible y rinde menos kilómetros. Solo cómprala si tu uso real es más del 40% off-road agresivo.",
        ],
      },
      {
        heading: "Dimensiones más comunes en Colombia",
        paragraphs: [
          "Camioneta media (Hilux 4x2 antigua, Frontier, Mazda BT-50): 245/70R16 y 265/70R16 son las dimensiones más vistas. Ofrecen buen flanco para destapada, kilometraje aceptable y precio razonable.",
          "Camioneta moderna media (Hilux 4x4, Ranger, Amarok): 265/65R17 y 265/60R18 son las dimensiones de fábrica. La 17 da más flanco para destapada; la 18 da mejor estética y manejo en pavimento.",
          "SUV grande y pickup grande (Fortuner, Prado, F-150, Cheyenne): 285/60R18, 275/55R20 y 285/45R22 dominan el segmento. Aquí ya entras en perfiles bajos donde la M/T pierde sentido por cuestiones de geometría.",
          "SUV familiar tipo Tucson, CX-5, RAV4: 235/65R17, 235/60R18, 225/60R18 son las dimensiones de fábrica. En este segmento, casi siempre la respuesta correcta es H/T —no son camionetas de off-road real.",
        ],
      },
      {
        heading: "Decisión por porcentaje real de uso",
        paragraphs: [
          "80% pavimento o más: H/T premium o asiática top. Ganas en kilometraje (60.000–90.000 km), en silencio y en consumo. Marcas a considerar: Michelin Defender LTX, Bridgestone Dueler H/L Alenza, Continental CrossContact LX25, Hankook Dynapro HP2. Sailun y Triangle también tienen H/T decentes en el segmento económico.",
          "Uso 50/50 o 60/40 (asfalto y destapada): A/T. Pierde 10–15% de kilometraje vs H/T y suma algo de ruido, pero gana enormemente en destapada, en lluvia fuerte y en flanco resistente. La BFGoodrich KO2 es referencia mundial; Hankook Dynapro AT2 y Continental CrossContact AT son alternativas serias más económicas.",
          "Uso 40% o más de off-road real (montaña, finca con vías destapadas, cruces de río): M/T. Aceptas el ruido, el consumo y el menor kilometraje a cambio de tracción y resistencia que ninguna otra llanta entrega. Pero sé honesto con tu uso: la mayoría de las M/T vendidas en Colombia rueda 90% asfalto y rinde 35.000 km cuando podrían rendir 70.000 con A/T.",
        ],
      },
      {
        heading: "Lo que casi nadie te dice sobre carga y velocidad",
        paragraphs: [
          "Las camionetas pickup tienen índice de carga más alto de lo que parece, especialmente cuando cargas materiales en el platón. Verifica que la llanta que compras tenga índice igual o superior al original. Una camioneta diésel cargada con 800 kg en el platón en una llanta P (pasajero) en lugar de LT es un riesgo real.",
          "El índice de velocidad típico en camionetas es S (180), T (190) o H (210). Una M/T agresiva muchas veces baja a Q (160). Para uso en Colombia esto suele estar bien, pero verifica que no estés bajando el índice respecto al original.",
          "Si vas a poner llantas más altas que las originales (para subir el carro), mide el espacio del guardafango con la suspensión comprimida y verifica que no roce. Y recalibra el velocímetro: una llanta 5% más alta hace que el odómetro marque 5% menos kilómetros.",
        ],
      },
    ],
    faqs: [
      {
        q: "¿Las llantas A/T sirven para mi camioneta de uso urbano?",
        a: "Sirven, pero pierdes ventajas. Si tu uso real es 95% urbano y 5% de viajes esporádicos a fincas, una H/T premium te dará más kilometraje, menos ruido y menos consumo. La A/T tiene sentido si haces destapada al menos una vez por semana.",
        },
      {
        q: "¿Puedo poner llantas más anchas que las originales?",
        a: "Hasta cierto punto. Subir un escalón (de 245 a 265, por ejemplo) suele caber sin problemas si mantienes el aspecto y rin proporcionales. Subir dos o más escalones implica verificar guardafango, recalibrar velocímetro y revisar que no afecte ABS ni control de estabilidad.",
      },
      {
        q: "¿Qué tan importante es la marca en una llanta de camioneta?",
        a: "Mucho más en A/T y M/T que en H/T. Una H/T asiática top decente es bastante similar a una premium en uso normal. Pero en A/T y M/T, la diferencia entre BFGoodrich KO2 y una M/T genérica es enorme: el premium dura más, no se descascara y mantiene tracción cuando la económica ya está calva.",
      },
      {
        q: "¿Las llantas H/T sirven para subir a páramos o trochas en La Calera, Choachí, etc.?",
        a: "Para destapada esporádica con clima seco, sí. Para destapada con barro fresco, no: H/T se llena de lodo y pierde tracción. Si subes regularmente, A/T es la respuesta correcta.",
      },
      {
        q: "¿Necesito llantas con escudo de invierno (símbolo 3PMSF) en Colombia?",
        a: "No. El símbolo 3PMSF (montaña con copo de nieve) certifica desempeño en nieve real, escenario que no tenemos. Algunas A/T premium lo traen igualmente, pero no debe ser un criterio de compra para uso colombiano.",
      },
      {
        q: "¿Cuánto rinde una llanta de camioneta?",
        a: "H/T premium: 60.000–90.000 km. A/T premium: 50.000–70.000 km. M/T premium: 30.000–50.000 km. Asiática top rinde aproximadamente 70–80% de esos números. Con presión correcta y rotación cada 8.000–10.000 km, llegas al límite alto del rango.",
      },
    ],
    relatedTerms: [
      "llanta-all-season",
      "llanta-off-road",
      "tipos-de-terreno",
      "indice-de-carga",
      "dimension-llanta",
    ],
    marketplaceLinks: [
      { label: "Llantas de camioneta", href: "/marketplace/categoria/camioneta" },
      { label: "Marcas premium", href: "/marketplace/brand/michelin" },
      { label: "Bridgestone para camioneta", href: "/marketplace/brand/bridgestone" },
      { label: "Continental para camioneta", href: "/marketplace/brand/continental" },
    ],
    relatedGuides: [
      "como-leer-dimension-llanta",
      "como-extender-vida-util-llantas",
      "llantas-premium-vs-economicas",
    ],
  },

  // ---------------------------------------------------------------------------
  // 6. Cómo extender la vida útil de tus llantas
  // ---------------------------------------------------------------------------
  {
    slug: "como-extender-vida-util-llantas",
    title: "Cómo extender la vida útil de tus llantas",
    category: "mantenimiento",
    readMinutes: 8,
    updatedDate: "2026-05-06",
    shortDescription:
      "Las seis prácticas que duplican la vida útil de tus llantas: presión, alineación, balanceo, rotación, carga y manejo defensivo.",
    intro:
      "Una llanta que debería rendir 60.000 km muere a los 28.000 si la maltratas, y rinde 75.000 si la cuidas bien. La diferencia no son los productos exóticos ni los aditivos: son seis hábitos básicos que casi nadie aplica completos. Esta guía te los lista en orden de impacto, con cifras concretas de cuánto extra ganas con cada uno.",
    sections: [
      {
        heading: "Presión: el factor que más impacto tiene (y el más ignorado)",
        paragraphs: [
          "La presión incorrecta es responsable de aproximadamente el 60% de los problemas de desgaste prematuro. Una llanta con 20% de baja presión pierde 25% de vida útil y aumenta el consumo de combustible 5%. Una llanta sobreinflada 15% genera desgaste central, manejo nervioso y mayor riesgo de daño por hueco.",
          "Mide presión cada 15 días en frío (vehículo parado al menos 3 horas), con un manómetro digital propio —los del semáforo y la bomba están descalibrados con frecuencia. Usa la presión que recomienda la placa de la puerta del conductor, no la que está marcada en el flanco (esa es la presión máxima, no la operativa).",
          "Si vas a cargar peso, sube la presión 3–5 psi sobre la nominal. Si vas a hacer carretera larga a alta velocidad sostenida, sube 2 psi. Y nunca bajes presión por 'más comodidad': comodidad mata llantas.",
        ],
      },
      {
        heading: "Alineación: la diferencia entre desgaste parejo y desgaste en bisel",
        paragraphs: [
          "Una alineación desviada hace que la llanta arrastre lateralmente en lugar de rodar limpia. El resultado es desgaste en forma de bisel (un lado más bajo que el otro) o desgaste plumeado al pasar la mano sobre la banda. En 5.000 km de mala alineación, puedes perder 30% de la vida útil de la llanta.",
          "Haz alineación en estos casos: cada 15.000–20.000 km de rutina, después de cualquier golpe fuerte (hueco, andén, choque), al cambiar llantas nuevas, y siempre que sientas el carro tirar a un lado o el volante torcido al ir derecho. En Colombia, una alineación seria cuesta entre 80.000 y 150.000 pesos y se paga sola en kilómetros extra.",
        ],
      },
      {
        heading: "Balanceo: vibración que destruye banda y suspensión",
        paragraphs: [
          "El balanceo iguala el peso de la llanta y el rin alrededor del eje. Cuando está mal, la llanta vibra a velocidades específicas (típicamente 80–110 km/h), y esa vibración genera desgaste irregular en parches —no en toda la banda—.",
          "Manda a balancear con cada cambio de llantas, con cada rotación, y siempre que sientas vibración en el volante o en el asiento. Pide balanceo dinámico (de dos planos), no estático. Cuesta 25.000–60.000 pesos por las cuatro llantas y es de los gastos más rentables de mantenimiento.",
        ],
      },
      {
        heading: "Rotación: cambia la posición cada 8.000–10.000 km",
        paragraphs: [
          "Las llantas de un mismo vehículo no se desgastan parejo. En tracción delantera, las delanteras se desgastan más rápido por el peso del motor y la fuerza de giro. En tracción trasera, las traseras llevan torque y se desgastan más rápido. La rotación periódica iguala el desgaste y extiende el conjunto.",
          "Patrones recomendados: en tracción delantera, cruza las traseras hacia adelante (delanteras pasan atrás directo, traseras pasan adelante cruzadas) cada 8.000–10.000 km. En 4x4 y AWD, rotación cíclica de las cuatro. En camionetas pickup con dual rear (tractomula no aplica acá): rotación entre delanteras y traseras según patrón del fabricante.",
          "Sin rotación, las dos llantas más cargadas mueren a los 35.000 km mientras las otras dos siguen al 60% de banda. Con rotación, las cuatro mueren juntas a los 55.000–65.000 km. La diferencia es plata directa.",
        ],
      },
      {
        heading: "Sobrecarga: el asesino silencioso del flanco",
        paragraphs: [
          "Cargar el vehículo por encima del peso bruto admisible es la forma más rápida de matar llantas y causar fallas catastróficas. La sobrecarga estresa el flanco, genera calor que degrada el caucho y reduce vida útil hasta un 50% en cargas sostenidas del 20% por encima del nominal.",
          "Esto aplica especialmente a camionetas pickup que cargan materiales, y a tractomulas donde cada 1.000 kg extra son medibles en CPK. Si tu uso real implica carga frecuente, sube la presión y, si el peso es estructural, considera llantas con índice de carga mayor.",
        ],
      },
      {
        heading: "Manejo defensivo: huecos, andenes y arrancones",
        paragraphs: [
          "Cada hueco que pegas a 60 km/h golpea el cinturón de acero del casco; el daño no se ve por fuera pero queda. Cinco huecos fuertes pueden bajar la vida útil 10–15%. La regla: bájale velocidad antes del hueco, no encima del hueco.",
          "Subir el andén con la llanta atravesada deforma flanco. Hacer arrancones quema banda en segundos. Frenadas bruscas dejan zonas planas (flat spots) que ya no se recuperan. Manejar suave es manejar barato a 5 años.",
        ],
      },
    ],
    howToSteps: [
      {
        name: "Verifica presión cada 15 días",
        text: "Con manómetro digital propio, vehículo en frío, presión según placa de puerta (no flanco). Ajusta antes de viaje largo o carga pesada.",
      },
      {
        name: "Programa alineación cada 15–20 mil km",
        text: "Y siempre después de un golpe fuerte. Si el carro tira a un lado o el volante está torcido, ve de inmediato.",
      },
      {
        name: "Balancea con cada cambio o rotación",
        text: "Pide balanceo dinámico de dos planos. Si sientes vibración en el volante a velocidades específicas, balancea aunque no toque por kilometraje.",
      },
      {
        name: "Rota llantas cada 8–10 mil km",
        text: "Patrón según tracción del vehículo. Aprovecha cada cambio de aceite para hacer la rotación al tiempo.",
      },
      {
        name: "Respeta el peso bruto admisible",
        text: "Verifica el dato en el manual o placa del vehículo. Si cargas habitualmente, sube presión 3–5 psi y considera llantas con mayor índice de carga.",
      },
      {
        name: "Maneja defensivo",
        text: "Bájale al hueco antes de pisarlo, sube andenes de frente y despacio, evita arrancones y frenadas bruscas. Cada hábito suma kilómetros al total.",
      },
    ],
    faqs: [
      {
        q: "¿Cuánto extra puedo extender la vida útil con buen mantenimiento?",
        a: "Entre 30% y 50% sobre el rendimiento de una llanta maltratada. Si tu llanta nominal rinde 50.000 km, con buen mantenimiento llegas a 65.000–75.000. Si la maltratas, mueres a los 30.000.",
      },
      {
        q: "¿El nitrógeno realmente ayuda?",
        a: "Marginalmente. El nitrógeno reduce la pérdida de presión por permeabilidad y la oxidación interna, lo que importa en aviación y en flotas con TPMS estricto. Para uso de calle, mantener la presión correcta cada 15 días con aire normal es 95% del beneficio.",
      },
      {
        q: "¿Sirven los selladores químicos para extender vida útil?",
        a: "No. Los selladores tipo Slime están diseñados para reparar pinchazos pequeños temporales, no para extender vida. Algunos pueden incluso desbalancear la llanta.",
      },
      {
        q: "¿Debo guardar las llantas si cambio a un set distinto temporalmente?",
        a: "Sí, en lugar fresco, seco, sin luz solar directa y de pie (no apiladas más de un mes). Las llantas almacenadas mal pierden caucho usable por endurecimiento.",
      },
      {
        q: "¿Cómo sé si mi llanta tiene desgaste irregular?",
        a: "Pasa la mano sobre la banda en sentido de marcha y luego cruzado. Si sientes biseles, plumeo o parches lisos alternados con relieve, hay desgaste irregular y necesitas revisar alineación, balanceo o suspensión.",
      },
    ],
    relatedTerms: [
      "alineacion",
      "balanceo",
      "rotacion-de-llantas",
      "psi",
      "vida-util-de-llanta",
    ],
    marketplaceLinks: [
      { label: "Catálogo general", href: "/marketplace" },
      { label: "Llantas de auto", href: "/marketplace/categoria/auto" },
      { label: "Llantas de camioneta", href: "/marketplace/categoria/camioneta" },
    ],
    relatedGuides: [
      "alineacion-balanceo-rotacion",
      "guia-presion-inflado-llantas",
      "como-calcular-cpk",
    ],
  },

  // ---------------------------------------------------------------------------
  // 7. Cómo calcular el CPK de tus llantas
  // ---------------------------------------------------------------------------
  {
    slug: "como-calcular-cpk",
    title: "Cómo calcular el CPK de tus llantas",
    category: "flota",
    readMinutes: 7,
    updatedDate: "2026-05-06",
    shortDescription:
      "Fórmula del costo por kilómetro (CPK), ejemplos con números reales en pesos colombianos, e inclusión del reencauche en el cálculo.",
    intro:
      "El CPK (costo por kilómetro) es la única métrica que importa cuando comparas llantas en una flota. Sin CPK, una llanta de 2,3 millones que rinde 130.000 km parece más cara que una de 1,2 millones que rinde 50.000 —cuando en realidad la primera te ahorra 6 pesos por kilómetro. Esta guía te enseña la fórmula, te la aplica con números reales del mercado colombiano, y te muestra cómo incorporar el reencauche.",
    sections: [
      {
        heading: "La fórmula básica",
        paragraphs: [
          "CPK = (Precio de la llanta) / (Kilómetros rendidos hasta el retiro). Es decir, cuánto te cuesta cada kilómetro solo en el costo de la llanta, sin contar combustible, mantenimiento ni mano de obra.",
          "Ejemplo simple: una llanta nueva premium para tractomula cuesta 2.100.000 pesos y rinde 105.000 km hasta el retiro. CPK = 2.100.000 / 105.000 = 20 pesos por kilómetro.",
          "Esta cifra de 20 pesos/km es tu base de comparación. Cualquier alternativa que ofrezca un CPK menor es candidata seria, asumiendo que cumple la dimensión, el índice de carga y la calidad mínima requerida.",
        ],
      },
      {
        heading: "Ejemplo 1: premium vs económica",
        paragraphs: [
          "Llanta A — Premium 295/80R22.5: precio 2.100.000, rinde 100.000 km en tracción. CPK = 21 pesos/km.",
          "Llanta B — Asiática top 295/80R22.5: precio 1.300.000, rinde 70.000 km en tracción. CPK = 18,6 pesos/km.",
          "Llanta C — Asiática económica 295/80R22.5: precio 950.000, rinde 45.000 km en tracción. CPK = 21,1 pesos/km.",
          "Conclusión: la asiática top (B) gana en CPK puro de llanta. La premium (A) pierde por 2,5 pesos/km, pero gana en cuanto sumas el reencauche, como veremos. La económica (C) cuesta lo mismo por kilómetro que la premium pero sin opción de reencauche —es la peor decisión cuando hay datos reales.",
        ],
      },
      {
        heading: "Ejemplo 2: incluyendo el reencauche",
        paragraphs: [
          "Volvamos a la llanta A (premium 2.100.000, rinde 100.000 km nueva). Su casco aguanta dos reencauches profundos a 800.000 pesos cada uno, y cada reencauche rinde 70.000 km en remolque y 65.000 km en tracción de segundo ciclo.",
          "Vida total del casco: 100.000 km (nueva) + 70.000 km (primer reencauche) + 65.000 km (segundo reencauche) = 235.000 km. Costo total: 2.100.000 + 800.000 + 800.000 = 3.700.000 pesos. CPK total = 3.700.000 / 235.000 = 15,7 pesos/km.",
          "Con la llanta B (asiática top), si el casco solo aguanta un reencauche y rinde menos en cada ciclo: 70.000 + 50.000 = 120.000 km, costo 1.300.000 + 700.000 = 2.000.000. CPK total = 16,6 pesos/km. La premium gana al final por 0,9 pesos/km, pero solo si tu reencauchadora es buena.",
        ],
      },
      {
        heading: "CPK por posición vs CPK consolidado",
        paragraphs: [
          "El CPK no se calcula igual en todas las posiciones porque la llanta no se desgasta igual. La fórmula real para una flota es: suma todos los costos de llanta (nueva + reencauches) durante un período, divide entre los kilómetros totales recorridos por la flota en ese período.",
          "En una flota de 10 cabezotes con 22 llantas cada uno corriendo 200.000 km/año por unidad: 10 × 200.000 = 2.000.000 km/año. Si gastaste 280 millones en llantas en el año, tu CPK consolidado de flota es 140 pesos/km de equipo (no por llanta —por equipo de 22 llantas).",
          "Este CPK consolidado es la cifra que monitoreas mes a mes. Subir significa que algo cambió: cascos malos, mala posición, baja presión sistemática, o un proveedor de reencauche que empezó a fallar. Bajar significa que las decisiones están funcionando.",
        ],
      },
      {
        heading: "Errores comunes al calcular CPK",
        paragraphs: [
          "Error 1: usar el kilometraje 'según fabricante' en lugar del kilometraje real medido. Las hojas de marca son optimistas. Mide tu propio kilometraje promedio histórico.",
          "Error 2: olvidar costos accesorios (alineación, balanceo, rotación, mano de obra de cambio). En cálculos serios, suma estos costos al precio de la llanta. Pueden añadir 5–10% al CPK total.",
          "Error 3: comparar CPK entre posiciones distintas. Una llanta de remolque siempre rendirá más que una de tracción. Compara siempre dentro de la misma posición.",
          "Error 4: no considerar el costo de oportunidad cuando una llanta falla en ruta. Una llanta económica que se daña en carretera te genera grúa, parada operativa y entregas tardías. Ese costo invisible puede triplicar el CPK 'oficial' de la llanta.",
        ],
      },
    ],
    faqs: [
      {
        q: "¿Cada cuánto debo recalcular el CPK?",
        a: "Mensual a nivel de flota consolidada. Por modelo de llanta, recalcula cada vez que cierras un ciclo de vida útil completo (típicamente cada 6–12 meses).",
      },
      {
        q: "¿El CPK incluye el costo de combustible?",
        a: "No, en el sentido estándar el CPK es solo el costo de llanta dividido entre kilómetros. Algunas flotas calculan un 'CPK extendido' que suma combustible y mantenimiento; útil para análisis pero distinto al estándar.",
      },
      {
        q: "¿Cuál es un CPK bueno para tractomula en Colombia?",
        a: "CPK consolidado por equipo (22 llantas) entre 100 y 130 pesos/km es excelente en operación premium con reencauche bien gestionado. Entre 130 y 160 es promedio. Más de 180 indica problemas que hay que diagnosticar.",
      },
      {
        q: "¿Cómo calculo CPK si no tengo histórico?",
        a: "Usa proyecciones del fabricante con un descuento del 15–20% para reflejar condiciones reales colombianas, y empieza a medir desde la primera instalación. En seis meses tendrás datos propios que reemplazan la proyección.",
      },
      {
        q: "¿Para un carro particular sirve el CPK?",
        a: "Conceptualmente sí, pero el cálculo es trivial: precio del juego de 4 dividido entre kilómetros. Para uso particular, lo que más importa es la decisión inicial de marca y dimensión, no el seguimiento mensual.",
      },
      {
        q: "¿Hay calculadora online?",
        a: "Sí. TirePro tiene calculadora de CPK en la sección /calculadora donde ingresas precio, kilometraje proyectado y reencauches y te entrega el CPK total ponderado.",
      },
    ],
    relatedTerms: [
      "cpk",
      "reencauche",
      "vida-util-de-llanta",
      "rtd",
      "casco-de-la-llanta",
    ],
    marketplaceLinks: [
      { label: "Calculadora de CPK", href: "/calculadora" },
      { label: "Llantas de tractomula", href: "/marketplace/categoria/tractomula" },
      { label: "Reencauche", href: "/marketplace/categoria/reencauche" },
      { label: "Comparar marcas", href: "/marketplace/comparar" },
    ],
    relatedGuides: [
      "cuando-conviene-reencauchar-llantas",
      "llantas-premium-vs-economicas",
      "como-elegir-llantas-para-tractomula",
    ],
  },

  // ---------------------------------------------------------------------------
  // 8. Guía de presión de inflado por tipo de vehículo
  // ---------------------------------------------------------------------------
  {
    slug: "guia-presion-inflado-llantas",
    title: "Guía de presión de inflado por tipo de vehículo",
    category: "mantenimiento",
    readMinutes: 7,
    updatedDate: "2026-05-06",
    shortDescription:
      "Tabla de PSI por categoría (auto, camioneta, camión, bus, tractomula), por qué la presión correcta importa, y cómo medirla bien.",
    intro:
      "La presión de inflado es el ajuste más barato y más impactante que puedes hacerle a tus llantas. Una presión correcta extiende vida útil 25%, baja consumo de combustible 4–6% y mejora distancias de frenado. La mayoría de carros en Colombia ruedan con presión incorrecta porque la gente la mide cada seis meses, en caliente, con el manómetro de la bomba descalibrado. Esta guía te da la cifra correcta y el método correcto.",
    sections: [
      {
        heading: "Por qué la presión incorrecta es el factor que más mata llantas",
        paragraphs: [
          "Una llanta sub-inflada flexiona más en el flanco con cada giro. Esa flexión genera calor, y el calor degrada el caucho, separa los cinturones internos y reduce vida útil. Una llanta a 25% por debajo de presión muere al 50% del kilometraje nominal y consume 8% más combustible.",
          "Una llanta sobreinflada tiene huella reducida: la zona central de la banda lleva todo el peso, la llanta se desgasta solo por el centro y el comportamiento se vuelve nervioso, especialmente sobre piso mojado. Además, el flanco rígido pierde capacidad de absorber huecos, lo que aumenta el riesgo de daño catastrófico.",
          "El punto óptimo es la presión que recomienda el fabricante de tu vehículo, ajustada por carga y condiciones. Esa cifra se calcula a partir del peso real, la dimensión y la velocidad de operación, y la encuentras siempre en la placa de la puerta del conductor.",
        ],
      },
      {
        heading: "Tabla de PSI por categoría (referencia general)",
        paragraphs: [
          "Auto particular (sedán compacto, hatchback): 30–32 psi en las cuatro llantas, sin carga. Con cuatro pasajeros y maleta cargada, sube a 33–34 psi atrás. Carros como Logan, Spark, Mazda 3, Picanto entran en este rango.",
          "Camioneta y SUV: 32–36 psi para SUV familiar tipo Tucson o CX-5, y 35–40 psi para pickup tipo Hilux, Ranger, Frontier. Las pickup con platón cargado deben subir 3–5 psi en las traseras. Camionetas grandes tipo F-150, Cheyenne: 38–42 psi.",
          "Camión 4x2 y 4x4 (NPR, NQR, Sprinter): 70–95 psi en delantera, 80–105 psi en trasera, según peso bruto. Verifica siempre la placa porque hay variaciones grandes según modelo.",
          "Bus urbano e intermunicipal: 100–115 psi en dirección, 95–110 psi en tracción. Bus articulado o doble piso, hasta 120 psi en dirección.",
          "Tractomula 295/80R22.5: 110–120 psi en dirección, 100–110 psi en tracción, 100–110 psi en remolque. Con peso bruto cercano al máximo, tiende al límite alto del rango. Con peso bajo, no bajes de 95 psi en ninguna posición.",
        ],
      },
      {
        heading: "Cómo medir presión correctamente",
        paragraphs: [
          "Mide en frío. 'Frío' significa que el vehículo lleva mínimo 3 horas parado o que ha rodado menos de 2 km. Una llanta caliente (después de carretera o sol directo) marca 4–6 psi por encima de la presión real, y si soltas aire para ajustar a la cifra de la placa, dejas la llanta sub-inflada cuando enfríe.",
          "Usa un manómetro digital propio, calibrado al menos una vez al año. Los manómetros de las bombas y semáforos se descalibran rápido por uso intensivo. Un manómetro digital decente cuesta 60.000–120.000 pesos y se paga solo en la primera llanta que salvas.",
          "Mide siempre en las cuatro llantas (cinco si tienes repuesto), no solo en las que 'se ven bajas'. Una pérdida lenta de presión por una válvula vieja puede no ser visible hasta que es tarde.",
        ],
      },
      {
        heading: "Casos especiales: carga, viaje largo, clima",
        paragraphs: [
          "Si vas a cargar peso significativo (más del 30% del peso bruto disponible), sube presión 3–5 psi en las llantas que cargan más, y baja a la presión nominal cuando descargues. Esto aplica en camionetas pickup que llevan materiales y en autos familiares con maleta llena para viaje.",
          "En viaje largo a alta velocidad sostenida (más de 110 km/h por más de una hora), sube 2 psi sobre la nominal. Lo verifico antes de salir, no en el camino.",
          "En épocas de mucho calor (Llanos, Magdalena Medio, Costa en verano), el aire dentro de la llanta se expande y la presión sube 5–8 psi. No la liberes: esa cifra es el equilibrio operativo. Cuando la llanta vuelva a temperatura ambiente, la presión bajará al rango normal.",
        ],
      },
    ],
    howToSteps: [
      {
        name: "Encuentra la presión recomendada",
        text: "En la placa de la puerta del conductor o en el manual del vehículo. Anótala (delantera y trasera, con y sin carga).",
      },
      {
        name: "Verifica en frío",
        text: "Con el vehículo parado mínimo 3 horas o con menos de 2 km recorridos, mide cada llanta con tu manómetro digital propio.",
      },
      {
        name: "Ajusta si es necesario",
        text: "Si la lectura está más de 2 psi por debajo, infla. Si está más de 3 psi por encima, libera aire. Vuelve a medir tras inflar.",
      },
      {
        name: "Repite cada 15 días",
        text: "Calendariza la medición cada dos semanas. Antes de viajes largos o de cargar peso, mide adicionalmente.",
      },
    ],
    faqs: [
      {
        q: "¿La presión que viene en el flanco de la llanta es la que debo usar?",
        a: "No. La cifra del flanco (típicamente 'Max Press 44 psi' en carros y '125 psi' en tractomula) es la presión máxima que aguanta la llanta, no la operativa. Usa siempre la presión de la placa de la puerta del conductor.",
      },
      {
        q: "¿Cada cuánto debo medir presión?",
        a: "Cada 15 días en condiciones normales. Antes de viajes largos. Antes de cargar peso significativo. Y siempre que sospeches pinchazo lento.",
      },
      {
        q: "¿Sirve el TPMS de mi carro o necesito manómetro aparte?",
        a: "El TPMS te avisa cuando la presión cae por debajo de un umbral (típicamente 20% bajo la nominal). No sustituye la medición precisa. Usa el TPMS como alarma temprana y el manómetro como herramienta de ajuste.",
      },
      {
        q: "¿Las llantas pierden presión naturalmente?",
        a: "Sí, entre 1 y 3 psi por mes por permeabilidad del caucho y temperatura. Por eso la rutina cada 15 días tiene sentido. Si la pérdida es mayor a 3 psi en dos semanas, hay un problema (válvula, llanta o rin).",
      },
      {
        q: "¿Es cierto que con aire de nitrógeno no necesito medir presión?",
        a: "Falso. El nitrógeno reduce la pérdida de presión por permeabilidad pero no la elimina. Mide igual cada 15 días.",
      },
      {
        q: "¿Puedo usar la misma presión en todas las llantas?",
        a: "Solo si la placa lo dice así. Muchos vehículos especifican presión distinta entre delantera y trasera, o cargada y descargada. Respeta lo que diga la placa.",
      },
    ],
    relatedTerms: [
      "psi",
      "tpms",
      "tpms-vs-presion-manual",
      "vida-util-de-llanta",
      "alineacion",
    ],
    marketplaceLinks: [
      { label: "Catálogo general", href: "/marketplace" },
      { label: "Llantas de auto", href: "/marketplace/categoria/auto" },
      { label: "Llantas de camioneta", href: "/marketplace/categoria/camioneta" },
    ],
    relatedGuides: [
      "como-extender-vida-util-llantas",
      "alineacion-balanceo-rotacion",
    ],
  },

  // ---------------------------------------------------------------------------
  // 9. Alineación, balanceo y rotación: la trinidad del cuidado
  // ---------------------------------------------------------------------------
  {
    slug: "alineacion-balanceo-rotacion",
    title: "Alineación, balanceo y rotación: la trinidad del cuidado",
    category: "mantenimiento",
    readMinutes: 8,
    updatedDate: "2026-05-06",
    shortDescription:
      "Qué es cada uno, cuándo hacerlo, cómo identificar el problema (vibración, dirección torcida, desgaste irregular) y cuánto te cuesta no hacerlo.",
    intro:
      "Alineación, balanceo y rotación son los tres servicios que la mayoría de la gente pospone porque 'el carro va bien'. El problema es que cuando empiezas a sentir el síntoma, la llanta ya está perdida. Esta guía te explica qué hace cada servicio, cómo detectarlo antes de que sea costoso, y la frecuencia exacta para que no se te pase.",
    sections: [
      {
        heading: "Alineación: la geometría de la suspensión",
        paragraphs: [
          "La alineación ajusta los ángulos de la suspensión para que las llantas rueden derecho y paralelas. Los tres ángulos clave son convergencia (toe), camber y caster. Cuando uno de estos está fuera de especificación, la llanta arrastra lateralmente o trabaja torcida sobre la huella.",
          "Síntomas claros de alineación desajustada: el carro tira a un lado en pavimento liso, el volante queda torcido cuando vas derecho, sientes el carro 'pesado' al tomar curvas, o ves desgaste asimétrico en la banda (más en un lado que en el otro). Cualquiera de estos síntomas debe llevarte al alineador en menos de 500 km.",
          "Frecuencia recomendada: alineación cada 15.000–20.000 km de rutina, después de cualquier impacto fuerte (hueco profundo, andén, choque), al instalar llantas nuevas, y siempre que cambies componentes de suspensión (rótulas, tijeras, terminales).",
        ],
      },
      {
        heading: "Balanceo: el peso parejo alrededor del eje",
        paragraphs: [
          "El balanceo iguala el peso de la llanta más el rin alrededor del eje de rotación. Una llanta perfectamente balanceada gira sin generar fuerzas centrífugas oscilantes; una desbalanceada genera vibración a velocidades específicas (típicamente entre 80 y 120 km/h).",
          "Hay dos tipos de balanceo: estático (un solo plano) y dinámico (dos planos). Pide siempre balanceo dinámico. Cuesta lo mismo o casi lo mismo, y resuelve problemas que el estático no detecta. Las pesas se ponen en el aro o pegadas, según el tipo de rin.",
          "Síntomas de mal balanceo: vibración en el volante a una velocidad específica que desaparece al frenar o al subir/bajar de esa velocidad, vibración en el asiento o el piso del carro a velocidad constante, desgaste en parches puntuales de la banda (no parejo).",
        ],
      },
      {
        heading: "Rotación: redistribuir el desgaste",
        paragraphs: [
          "Las cuatro llantas de un mismo vehículo no se desgastan parejo. En tracción delantera, las delanteras llevan el motor y la fuerza de giro: se desgastan 30–40% más rápido que las traseras. En tracción trasera, las traseras llevan torque y se desgastan más rápido. La rotación periódica iguala ese desgaste y extiende la vida del juego completo.",
          "Patrones de rotación recomendados: en FWD (tracción delantera), cruza traseras hacia adelante y manda delanteras directo atrás. En RWD (tracción trasera), cruza delanteras hacia atrás. En 4x4 y AWD, rotación cíclica de las cuatro. En llantas direccionales (con flecha de sentido de marcha), solo rotación adelante-atrás del mismo lado.",
          "Frecuencia: cada 8.000–10.000 km, idealmente coincidiendo con cambio de aceite. Sin rotación, las dos llantas más cargadas mueren a 35.000 km mientras las otras dos siguen al 60% de banda. Con rotación, las cuatro llegan juntas a 55.000–65.000 km.",
        ],
      },
      {
        heading: "Cómo identificar qué de los tres falla",
        paragraphs: [
          "Si el carro tira a un lado en línea recta y el volante queda torcido: alineación. Es el síntoma más claro y nunca lo confundas con balanceo.",
          "Si sientes vibración a velocidad específica que no estaba antes: balanceo. Especialmente si la vibración aparece a 90–110 km/h y desaparece bajando de esa velocidad.",
          "Si dos llantas están notablemente más desgastadas que las otras dos: faltó rotación. Si todas están desgastadas pero una más en un costado: alineación. Si hay parches lisos alternados con relieve: balanceo o suspensión floja.",
          "Si tienes dos o tres síntomas a la vez, haz primero alineación, luego balanceo y luego rotación. El orden importa: la alineación corrige geometría, el balanceo corrige distribución de peso (ya con la geometría correcta), y la rotación distribuye el desgaste futuro.",
        ],
      },
      {
        heading: "Costo de no hacerlo: números reales",
        paragraphs: [
          "Una alineación serias en Bogotá o Medellín cuesta entre 80.000 y 150.000 pesos. Hacerla cada 18.000 km en un carro que hace 30.000 km/año es 130.000 pesos al año.",
          "No hacerla puede acortar la vida útil de las llantas en 30–40%. Si tu juego de 4 llantas cuesta 1.600.000 pesos, perder 30% son 480.000 pesos. La alineación se paga 3,5 veces.",
          "Mismo cálculo con balanceo (35.000–60.000 pesos por las 4) y rotación (15.000–30.000 pesos): la inversión total anual en mantenimiento básico de llantas no debería pasar de 250.000 pesos, y a cambio extiendes vida útil entre 30% y 50%.",
        ],
      },
    ],
    faqs: [
      {
        q: "¿Puedo hacer alineación, balanceo y rotación el mismo día?",
        a: "Sí, y es la combinación recomendada cada 15.000–20.000 km. Aprovecha el desmonte para hacer las tres cosas en la misma visita y ahorras tiempo y mano de obra duplicada.",
      },
      {
        q: "¿La alineación de tres ángulos es lo mismo que la alineación de carrocería?",
        a: "No. La alineación de tres ángulos ajusta convergencia, camber y caster en la suspensión. La 'alineación de carrocería' es un servicio para enderezar bastidor después de un choque y es algo distinto.",
      },
      {
        q: "¿Cómo sé si el alineador es serio?",
        a: "Pide ver el equipo (debe ser equipo láser o cámaras 3D, no solo cuerdas), pide ver el reporte impreso con valores antes y después, y verifica que ajusten los tres ángulos —convergencia, camber, caster—. Si solo te ajustan convergencia, no es alineación completa.",
      },
      {
        q: "¿Después de cambiar llantas siempre toca alinear?",
        a: "Sí. La instalación de llantas nuevas es el momento ideal para alinear porque tienes el carro desmontado y partes de cero. Pedirla 'al rato cuando me dé tiempo' lleva a postergarla por meses.",
      },
      {
        q: "¿La rotación se hace siempre igual o depende del tipo de llanta?",
        a: "Depende. Llantas no direccionales: patrón cruzado completo. Llantas direccionales (con flecha de sentido de marcha): solo adelante-atrás del mismo lado. Llantas asimétricas (con marcado 'outside'): rotación lateral pero respetando el outside hacia afuera.",
      },
      {
        q: "¿Puedo balancear yo mismo en casa?",
        a: "No. El balanceo dinámico requiere máquina balanceadora con sensores en dos planos. Hacerlo en casa con métodos caseros queda incompleto y muchas veces empeora el problema.",
      },
    ],
    relatedTerms: [
      "alineacion",
      "balanceo",
      "rotacion-de-llantas",
      "vida-util-de-llanta",
      "banda-de-rodamiento",
    ],
    marketplaceLinks: [
      { label: "Catálogo general", href: "/marketplace" },
      { label: "Llantas de auto", href: "/marketplace/categoria/auto" },
      { label: "Llantas de camioneta", href: "/marketplace/categoria/camioneta" },
    ],
    relatedGuides: [
      "como-extender-vida-util-llantas",
      "guia-presion-inflado-llantas",
    ],
  },

  // ---------------------------------------------------------------------------
  // 10. Llantas premium vs económicas: cuándo paga la diferencia
  // ---------------------------------------------------------------------------
  {
    slug: "llantas-premium-vs-economicas",
    title: "Llantas premium vs económicas: cuándo paga la diferencia",
    category: "compra",
    readMinutes: 9,
    updatedDate: "2026-05-06",
    shortDescription:
      "Análisis honesto de cuándo pagar premium vale la pena y cuándo una asiática top te da el mismo resultado por menos.",
    intro:
      "La pelea premium versus económica no se gana con loyalty de marca ni con prejuicio: se gana con números. Hay aplicaciones donde una Michelin se paga sola en 18 meses, y hay aplicaciones donde una Sailun bien elegida te da exactamente el mismo resultado por 40% menos. La pregunta correcta no es '¿cuál es mejor?', sino '¿cuál es mejor para mi uso real?'. Esta guía te da la matriz.",
    sections: [
      {
        heading: "Las tres categorías reales del mercado",
        paragraphs: [
          "Premium occidental: Michelin, Bridgestone, Continental, Goodyear, Pirelli. Llantas con desarrollo en pista y carretera durante décadas, casco reencauchable certificado, garantía de fabricante respaldada por red de servicio, y precio top del mercado. Son el referente que define el 100% de kilometraje.",
          "Asiática top (también llamada 'tier 2'): Hankook, Yokohama, Kumho, Toyo. Llantas con tecnología cercana al premium, calidad consistente, casco frecuentemente reencauchable, garantía menos amplia pero presente. Precio típico 25–35% por debajo del premium. En muchas aplicaciones la diferencia de rendimiento es marginal.",
          "Asiática mainstream y económica: Sailun, Triangle, Linglong, Aeolus, Doublestar y otras. Calidad muy heterogénea: hay modelos que rinden 80% del premium y modelos que rinden 50%. Precio entre 40% y 55% por debajo del premium. Aquí la elección por modelo específico importa más que la marca general.",
        ],
      },
      {
        heading: "Cuándo el premium se paga sola",
        paragraphs: [
          "Operación de tractomula con kilometraje alto y rutas largas. Cuando corres 200.000 km/año por unidad y reencauchas dos veces el casco, los 200.000 pesos extra de Michelin sobre Hankook se pagan solos por el segundo reencauche aprovechable y la mayor consistencia de la flota.",
          "Eje direccional de cualquier vehículo de carga o pasajero. La diferencia entre premium y económica en respuesta de dirección y en resistencia a impactos laterales es real, y en una posición donde la falla compromete dirección, el premium se justifica siempre.",
          "Camioneta o SUV de uso intensivo (más de 30.000 km/año) en mezcla pavimento+destapada. Una Michelin LTX o Bridgestone Dueler bien cuidada rinde 80.000 km, mientras una asiática mainstream del mismo tipo rinde 45.000–55.000. La premium se paga en 30 meses y aún sigue rodando.",
          "Vehículos donde la garantía y el respaldo importan: flotas que requieren homologación de seguridad (transporte de pasajeros, transporte de mercancía especial), o aplicaciones donde la falla genera costos operativos altos (parada de mina, parada de obra).",
        ],
      },
      {
        heading: "Cuándo la económica gana",
        paragraphs: [
          "Camioneta personal de uso bajo (menos de 18.000 km/año, 90% urbano). El kilometraje anual no alcanza para amortizar la diferencia de precio. Una Sailun o Triangle de calidad media va a durar 4–5 años igual, y al final del ciclo el carro probablemente ya cambió de uso o de dueño.",
          "Carro de servicio público (taxi, plataforma) donde la rotación de unidad es alta y el dueño no recupera la inversión a 5 años. Aquí la asiática top o mainstream con buen control de calidad es casi siempre la jugada correcta. Hankook y Sailun tienen modelos específicos para taxi muy probados.",
          "Posición de remolque en tractomula. El remolque no transmite torque, no gira con la misma exigencia, no frena con la misma carga. Una asiática mainstream o un reencauche bien hecho rinden el 90% del premium a la mitad del precio. Pagar premium en remolque es la forma más cara de no obtener nada extra.",
          "Operación de bajo kilometraje en general (camión de reparto urbano que hace 60.000 km/año, bus escolar que hace 40.000): el kilometraje anual no permite amortizar la diferencia y la asiática mainstream cumple sin problemas.",
        ],
      },
      {
        heading: "El error más caro: el medio del rango",
        paragraphs: [
          "El error que más vemos en flotas pequeñas y en compradores particulares es comprar una llanta 'mainstream barata' (no la económica de catálogo, pero tampoco una asiática top reconocida). Pagas 70% del precio premium y obtienes 50% del kilometraje. CPK al cierre: peor que ambos extremos.",
          "Si vas a ir económica, ve económica de marca conocida con buen track record (Sailun, Triangle, Hankook entry, Kumho entry). Si vas a ir premium, ve premium completo. Lo que está en medio es típicamente la peor relación costo-rendimiento.",
          "Aplicado al ejemplo numérico: una premium a 2,1M con 100.000 km da 21 pesos/km. Una asiática top a 1,3M con 70.000 km da 18,6 pesos/km. Una mainstream desconocida a 1,5M con 50.000 km da 30 pesos/km. El medio del rango pierde por amplio margen.",
        ],
      },
      {
        heading: "ROI por aplicación: la matriz resumen",
        paragraphs: [
          "Tractomula ruta larga, eje direccional: Premium gana siempre. ROI a 18 meses.",
          "Tractomula ruta larga, eje tracción primer ciclo: Premium o asiática top, casi empate. La premium gana solo si vas a aprovechar el segundo y tercer reencauche del casco.",
          "Tractomula remolque: Asiática mainstream o reencauche premium. Pagar premium no agrega valor.",
          "Camioneta personal mucho uso: Premium o asiática top en H/T. La premium se paga en 24–30 meses.",
          "Camioneta personal poco uso: Asiática mainstream con buen control de calidad. La premium nunca se amortiza.",
          "Sedán y hatchback urbano: Asiática top o mainstream. La diferencia premium no se justifica salvo casos muy específicos.",
          "Bus intermunicipal: Premium en dirección siempre, premium o top en tracción. La normativa y el riesgo lo justifican.",
          "Camión urbano de reparto: Asiática top en todas las posiciones. El kilometraje anual no soporta premium.",
        ],
      },
    ],
    faqs: [
      {
        q: "¿Hay alguna marca asiática que sea premium real?",
        a: "Hankook y Yokohama compiten cabeza a cabeza con premium occidental en muchos segmentos. Kumho y Toyo están un escalón abajo pero todavía son confiables. Más allá de esas marcas, la categoría premium se reserva a las occidentales tradicionales.",
      },
      {
        q: "¿Cómo identifico una asiática mainstream confiable de una mala?",
        a: "Busca historial de venta en Colombia mayor a 5 años, presencia en flotas comerciales (no solo en repuesto particular), garantía escrita de mínimo 12 meses, y reseñas de gestores de flota —no de usuarios particulares con muestras de uno—.",
      },
      {
        q: "¿La diferencia se nota al manejar?",
        a: "En carro particular, la diferencia de premium a asiática top es sutil: ligeramente menos ruido, mejor frenada en mojado, dirección un poco más precisa. De top a mainstream la diferencia ya es notable. En tractomula, la diferencia se nota más en consistencia (menos cascos rechazados) que en feel de manejo.",
      },
      {
        q: "¿Puedo poner premium adelante y económica atrás?",
        a: "En carro particular sí, y muchos lo hacen. La regla: dentro del mismo eje, mismo modelo y misma marca. Entre ejes, puedes mezclar siempre que cumplan dimensión e índice de carga. En camioneta y vehículos de carga, prefiere consistencia para evitar comportamiento dispar.",
      },
      {
        q: "¿La garantía de la premium realmente vale la pena?",
        a: "Si tu llanta falla por defecto de fábrica antes del 50% de banda, sí. La garantía premium reemplaza la llanta a costo prorrateado. La asiática top tiene garantía similar pero la red de respuesta es más limitada. La económica suele tener garantía corta o solo de cambio.",
      },
      {
        q: "¿Cuánto cuesta más una premium versus una económica equivalente?",
        a: "Entre 40% y 55% más. Para un set de 4 llantas de carro, la diferencia anda en 600.000–1.200.000 pesos. Para tractomula, entre 700.000 y 900.000 pesos por llanta. Saber si esa diferencia se amortiza es lo que define la decisión.",
      },
    ],
    relatedTerms: [
      "marcas-de-llantas",
      "cpk",
      "vida-util-de-llanta",
      "comparativa-nueva-vs-reencauche",
      "casco-de-la-llanta",
    ],
    marketplaceLinks: [
      { label: "Comparar marcas", href: "/marketplace/comparar" },
      { label: "Michelin", href: "/marketplace/brand/michelin" },
      { label: "Bridgestone", href: "/marketplace/brand/bridgestone" },
      { label: "Continental", href: "/marketplace/brand/continental" },
    ],
    relatedGuides: [
      "como-calcular-cpk",
      "llanta-nueva-vs-reencauche",
      "como-elegir-llantas-camioneta",
    ],
  },
];

// ---------------------------------------------------------------------------
// Slug → Guide lookup. Returns undefined when slug doesn't match any guide.
// ---------------------------------------------------------------------------
export function guideFromSlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
