// Mapeo de códigos de banco argentinos a sus datos
// Los primeros 3 dígitos del CBU identifican el banco

export interface BancoInfo {
  codigo: string
  nombre: string
  nombreCorto: string
  logo?: string
  colorPrimario: string
}

// Logos obtenidos de fuentes públicas (bancos.com.ar, etc.)
export const BANCOS_ARGENTINA: Record<string, BancoInfo> = {
  '007': {
    codigo: '007',
    nombre: 'BANCO DE GALICIA Y BUENOS AIRES S.A.',
    nombreCorto: 'Galicia',
    logo: 'https://www.galicia.ar/content/dam/galicia/logos/logo-galicia.svg',
    colorPrimario: '#E85D04'
  },
  '011': {
    codigo: '011',
    nombre: 'BANCO DE LA NACION ARGENTINA',
    nombreCorto: 'Nación',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Banco_de_la_Naci%C3%B3n_Argentina_logo.svg/200px-Banco_de_la_Naci%C3%B3n_Argentina_logo.svg.png',
    colorPrimario: '#003366'
  },
  '014': {
    codigo: '014',
    nombre: 'BANCO DE LA PROVINCIA DE BUENOS AIRES',
    nombreCorto: 'Provincia',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Banco_Provincia_logo.svg/200px-Banco_Provincia_logo.svg.png',
    colorPrimario: '#006633'
  },
  '015': {
    codigo: '015',
    nombre: 'INDUSTRIAL AND COMMERCIAL BANK OF CHINA',
    nombreCorto: 'ICBC',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Industrial_and_Commercial_Bank_of_China_logo.svg/200px-Industrial_and_Commercial_Bank_of_China_logo.svg.png',
    colorPrimario: '#C41230'
  },
  '016': {
    codigo: '016',
    nombre: 'CITIBANK N.A.',
    nombreCorto: 'Citibank',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Citi.svg/200px-Citi.svg.png',
    colorPrimario: '#003B70'
  },
  '017': {
    codigo: '017',
    nombre: 'BANCO BBVA ARGENTINA S.A.',
    nombreCorto: 'BBVA',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/BBVA_2019.svg/200px-BBVA_2019.svg.png',
    colorPrimario: '#004481'
  },
  '020': {
    codigo: '020',
    nombre: 'BANCO DE LA PROVINCIA DE CORDOBA S.A.',
    nombreCorto: 'Bancor',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Bancor_logo.svg/200px-Bancor_logo.svg.png',
    colorPrimario: '#E30613'
  },
  '027': {
    codigo: '027',
    nombre: 'BANCO SUPERVIELLE S.A.',
    nombreCorto: 'Supervielle',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Banco_Supervielle_logo.svg/200px-Banco_Supervielle_logo.svg.png',
    colorPrimario: '#00A0DC'
  },
  '029': {
    codigo: '029',
    nombre: 'BANCO DE LA CIUDAD DE BUENOS AIRES',
    nombreCorto: 'Ciudad',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Banco_Ciudad_logo.svg/200px-Banco_Ciudad_logo.svg.png',
    colorPrimario: '#003366'
  },
  '034': {
    codigo: '034',
    nombre: 'BANCO PATAGONIA S.A.',
    nombreCorto: 'Patagonia',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Banco_Patagonia_logo.svg/200px-Banco_Patagonia_logo.svg.png',
    colorPrimario: '#E31837'
  },
  '044': {
    codigo: '044',
    nombre: 'BANCO HIPOTECARIO S.A.',
    nombreCorto: 'Hipotecario',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Banco_Hipotecario_logo.svg/200px-Banco_Hipotecario_logo.svg.png',
    colorPrimario: '#005BAC'
  },
  '045': {
    codigo: '045',
    nombre: 'BANCO DE SAN JUAN S.A.',
    nombreCorto: 'San Juan',
    colorPrimario: '#006633'
  },
  '065': {
    codigo: '065',
    nombre: 'BANCO MUNICIPAL DE ROSARIO',
    nombreCorto: 'Municipal Rosario',
    colorPrimario: '#008542'
  },
  '072': {
    codigo: '072',
    nombre: 'BANCO SANTANDER ARGENTINA S.A.',
    nombreCorto: 'Santander',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Banco_Santander_Logotipo.svg/200px-Banco_Santander_Logotipo.svg.png',
    colorPrimario: '#EC0000'
  },
  '083': {
    codigo: '083',
    nombre: 'BANCO DEL CHUBUT S.A.',
    nombreCorto: 'Chubut',
    colorPrimario: '#00529B'
  },
  '086': {
    codigo: '086',
    nombre: 'BANCO DE SANTA CRUZ S.A.',
    nombreCorto: 'Santa Cruz',
    colorPrimario: '#003366'
  },
  '093': {
    codigo: '093',
    nombre: 'BANCO DE LA PAMPA SOCIEDAD DE ECONOMÍA MIXTA',
    nombreCorto: 'Pampa',
    colorPrimario: '#006633'
  },
  '094': {
    codigo: '094',
    nombre: 'BANCO DE CORRIENTES S.A.',
    nombreCorto: 'Corrientes',
    colorPrimario: '#D4AF37'
  },
  '097': {
    codigo: '097',
    nombre: 'BANCO PROVINCIA DEL NEUQUÉN S.A.',
    nombreCorto: 'Neuquén',
    colorPrimario: '#003366'
  },
  '131': {
    codigo: '131',
    nombre: 'BANK OF CHINA LIMITED SUCURSAL BUENOS AIRES',
    nombreCorto: 'Bank of China',
    colorPrimario: '#C41230'
  },
  '143': {
    codigo: '143',
    nombre: 'BRUBANK S.A.U.',
    nombreCorto: 'Brubank',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Brubank_logo.svg/200px-Brubank_logo.svg.png',
    colorPrimario: '#6C3CE9'
  },
  '147': {
    codigo: '147',
    nombre: 'BIBANK S.A.',
    nombreCorto: 'Bibank',
    colorPrimario: '#FF6B00'
  },
  '165': {
    codigo: '165',
    nombre: 'JPMORGAN CHASE BANK',
    nombreCorto: 'JP Morgan',
    colorPrimario: '#003087'
  },
  '191': {
    codigo: '191',
    nombre: 'BANCO CREDICOOP COOPERATIVO LIMITADO',
    nombreCorto: 'Credicoop',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Banco_Credicoop_logo.svg/200px-Banco_Credicoop_logo.svg.png',
    colorPrimario: '#003366'
  },
  '198': {
    codigo: '198',
    nombre: 'BANCO DE VALORES S.A.',
    nombreCorto: 'Valores',
    colorPrimario: '#003366'
  },
  '247': {
    codigo: '247',
    nombre: 'BANCO ROELA S.A.',
    nombreCorto: 'Roela',
    colorPrimario: '#1E3A5F'
  },
  '254': {
    codigo: '254',
    nombre: 'BANCO MARIVA S.A.',
    nombreCorto: 'Mariva',
    colorPrimario: '#003366'
  },
  '266': {
    codigo: '266',
    nombre: 'BNP PARIBAS',
    nombreCorto: 'BNP Paribas',
    colorPrimario: '#00915A'
  },
  '268': {
    codigo: '268',
    nombre: 'BANCO PROVINCIA DE TIERRA DEL FUEGO',
    nombreCorto: 'Tierra del Fuego',
    colorPrimario: '#003366'
  },
  '269': {
    codigo: '269',
    nombre: 'BANCO DE LA REPUBLICA ORIENTAL DEL URUGUAY',
    nombreCorto: 'BROU',
    colorPrimario: '#003366'
  },
  '277': {
    codigo: '277',
    nombre: 'BANCO SAENZ S.A.',
    nombreCorto: 'Saenz',
    colorPrimario: '#1E3A5F'
  },
  '281': {
    codigo: '281',
    nombre: 'BANCO MERIDIAN S.A.',
    nombreCorto: 'Meridian',
    colorPrimario: '#003366'
  },
  '285': {
    codigo: '285',
    nombre: 'BANCO MACRO S.A.',
    nombreCorto: 'Macro',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Banco_Macro_logo.svg/200px-Banco_Macro_logo.svg.png',
    colorPrimario: '#0033A0'
  },
  '299': {
    codigo: '299',
    nombre: 'BANCO COMAFI SOCIEDAD ANONIMA',
    nombreCorto: 'Comafi',
    colorPrimario: '#003366'
  },
  '300': {
    codigo: '300',
    nombre: 'BANCO DE INVERSION Y COMERCIO EXTERIOR S.A.',
    nombreCorto: 'BICE',
    colorPrimario: '#003366'
  },
  '301': {
    codigo: '301',
    nombre: 'BANCO PIANO S.A.',
    nombreCorto: 'Piano',
    colorPrimario: '#003366'
  },
  '305': {
    codigo: '305',
    nombre: 'BANCO JULIO SOCIEDAD ANONIMA',
    nombreCorto: 'Julio',
    colorPrimario: '#003366'
  },
  '309': {
    codigo: '309',
    nombre: 'BANCO RIOJA SOCIEDAD ANONIMA UNIPERSONAL',
    nombreCorto: 'Rioja',
    colorPrimario: '#003366'
  },
  '310': {
    codigo: '310',
    nombre: 'BANCO DEL SOL S.A.',
    nombreCorto: 'Del Sol',
    colorPrimario: '#F7931E'
  },
  '311': {
    codigo: '311',
    nombre: 'NUEVO BANCO DEL CHACO S.A.',
    nombreCorto: 'Nuevo Chaco',
    colorPrimario: '#006633'
  },
  '312': {
    codigo: '312',
    nombre: 'BANCO VOII S.A.',
    nombreCorto: 'Voii',
    colorPrimario: '#6C3CE9'
  },
  '315': {
    codigo: '315',
    nombre: 'BANCO DE FORMOSA S.A.',
    nombreCorto: 'Formosa',
    colorPrimario: '#006633'
  },
  '319': {
    codigo: '319',
    nombre: 'BANCO CMF S.A.',
    nombreCorto: 'CMF',
    colorPrimario: '#003366'
  },
  '321': {
    codigo: '321',
    nombre: 'BANCO DE SANTIAGO DEL ESTERO S.A.',
    nombreCorto: 'Santiago del Estero',
    colorPrimario: '#003366'
  },
  '322': {
    codigo: '322',
    nombre: 'BANCO INDUSTRIAL S.A.',
    nombreCorto: 'Industrial',
    colorPrimario: '#003366'
  },
  '330': {
    codigo: '330',
    nombre: 'NUEVO BANCO DE SANTA FE SOCIEDAD ANONIMA',
    nombreCorto: 'Santa Fe',
    colorPrimario: '#006633'
  },
  '331': {
    codigo: '331',
    nombre: 'BANCO CETELEM ARGENTINA S.A.',
    nombreCorto: 'Cetelem',
    colorPrimario: '#00915A'
  },
  '332': {
    codigo: '332',
    nombre: 'BANCO DE SERVICIOS FINANCIEROS S.A.',
    nombreCorto: 'Servicios Financieros',
    colorPrimario: '#003366'
  },
  '338': {
    codigo: '338',
    nombre: 'BANCO DE SERVICIOS Y TRANSACCIONES SAU',
    nombreCorto: 'BST',
    colorPrimario: '#003366'
  },
  '339': {
    codigo: '339',
    nombre: 'RCI BANQUE S.A.',
    nombreCorto: 'RCI',
    colorPrimario: '#003366'
  },
  '340': {
    codigo: '340',
    nombre: 'BACS BANCO DE CREDITO Y SECURITIZACION S.A.',
    nombreCorto: 'BACS',
    colorPrimario: '#003366'
  },
  '341': {
    codigo: '341',
    nombre: 'BANCO MASVENTAS S.A.',
    nombreCorto: 'Masventas',
    colorPrimario: '#003366'
  },
  '384': {
    codigo: '384',
    nombre: 'UALA BANK S.A.U.',
    nombreCorto: 'Ualá',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Logo_uala.svg/200px-Logo_uala.svg.png',
    colorPrimario: '#3C64FA'
  },
  '386': {
    codigo: '386',
    nombre: 'NUEVO BANCO DE ENTRE RÍOS S.A.',
    nombreCorto: 'Entre Ríos',
    colorPrimario: '#006633'
  },
  '389': {
    codigo: '389',
    nombre: 'BANCO COLUMBIA S.A.',
    nombreCorto: 'Columbia',
    colorPrimario: '#E31837'
  },
  '426': {
    codigo: '426',
    nombre: 'BANCO BICA S.A.',
    nombreCorto: 'Bica',
    colorPrimario: '#003366'
  },
  '431': {
    codigo: '431',
    nombre: 'BANCO COINAG S.A.',
    nombreCorto: 'Coinag',
    colorPrimario: '#006633'
  },
  '432': {
    codigo: '432',
    nombre: 'BANCO DE COMERCIO S.A.',
    nombreCorto: 'Comercio',
    colorPrimario: '#003366'
  },
  '435': {
    codigo: '435',
    nombre: 'BANCO SUCREDITO REGIONAL S.A.U.',
    nombreCorto: 'Sucredito',
    colorPrimario: '#003366'
  },
  '448': {
    codigo: '448',
    nombre: 'BANCO DINO S.A.',
    nombreCorto: 'Dino',
    colorPrimario: '#E31837'
  },
  // Compañías Financieras
  '440': {
    codigo: '440',
    nombre: 'COMPAÑIA FINANCIERA ARGENTINA S.A.',
    nombreCorto: 'CFA',
    colorPrimario: '#003366'
  },
  '450': {
    codigo: '450',
    nombre: 'NARANJA DIGITAL COMPAÑÍA FINANCIERA S.A.',
    nombreCorto: 'Naranja',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Naranja_X_logo.svg/200px-Naranja_X_logo.svg.png',
    colorPrimario: '#FF6B00'
  }
}

/**
 * Obtiene la información del banco a partir de un CBU
 * @param cbu - Número de CBU (22 dígitos)
 * @returns Información del banco o null si no se encuentra
 */
export function getBancoFromCBU(cbu: string): BancoInfo | null {
  if (!cbu || cbu.length < 3) return null

  // Los primeros 3 dígitos son el código del banco
  const codigoBanco = cbu.substring(0, 3)

  return BANCOS_ARGENTINA[codigoBanco] || null
}

/**
 * Obtiene el nombre corto del banco a partir de un CBU
 */
export function getNombreBancoFromCBU(cbu: string): string {
  const banco = getBancoFromCBU(cbu)
  return banco?.nombreCorto || 'Banco desconocido'
}

/**
 * Genera las iniciales del banco para usar como fallback si no hay logo
 */
export function getInicialesBanco(nombreCorto: string): string {
  return nombreCorto
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

/**
 * Lista de todos los bancos disponibles (para selectores)
 */
export function getListaBancos(): BancoInfo[] {
  return Object.values(BANCOS_ARGENTINA).sort((a, b) =>
    a.nombreCorto.localeCompare(b.nombreCorto)
  )
}
