class NumberToLetter {
  static unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  static decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  static especiales = ['once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  static centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  static convertir(numero, moneda = 'SOLES') {
    if (typeof numero !== 'number' || isNaN(numero)) {
      throw new Error('El valor debe ser un número válido.');
    }

    const entero = Math.floor(numero);
    const decimal = Math.round((numero - entero) * 100);
    let letras = '';

    if (entero === 0) {
      letras = 'cero';
    } else if (entero <= 999999) {
      // Miles
      if (entero >= 1000) {
        const miles = Math.floor(entero / 1000);
        letras += `${this._convertirGrupo(miles)} mil `;
        entero %= 1000;
      }
      // Resto
      if (entero > 0) {
        letras += this._convertirGrupo(entero);
      }
    } else {
      throw new Error('Número fuera de rango (máximo 999,999.99).');
    }

    const decimalTexto = decimal.toString().padStart(2, '0');
    return `${letras.toUpperCase()} ${moneda} CON ${decimalTexto}/100`;
  }

  static _convertirGrupo(numero) {
    let texto = '';
    const c = Math.floor(numero / 100);
    const d = Math.floor((numero % 100) / 10);
    const u = numero % 10;

    // Centenas
    if (c > 0) {
      texto += this.centenas[c] + ' ';
    }

    // Decenas y unidades
    if (d === 1 && u > 0) {
      texto += this.especiales[u - 1] + ' ';
    } else {
      if (d > 0) {
        texto += this.decenas[d] + (u > 0 ? ' y ' : ' ');
      }
      if (u > 0 || (d === 0 && c === 0)) {
        texto += this.unidades[u] + ' ';
      }
    }

    return texto.trim();
  }
}

module.exports = NumberToLetter;