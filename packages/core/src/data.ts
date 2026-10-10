export type Dia = string & { readonly __brand: 'Dia' };

function formatar(y: number, m: number, d: number): Dia {
  const mes = String(m).padStart(2, '0');
  const dia = String(d).padStart(2, '0');
  return `${y}-${mes}-${dia}` as Dia;
}

function diaDeLocal(data: Date): Dia {
  return formatar(data.getFullYear(), data.getMonth() + 1, data.getDate());
}

export function hojeLocal(): Dia {
  return diaDeLocal(new Date());
}

export function addDias(dia: Dia, dias: number): Dia {
  const [ano = '0', mes = '1', diaDoMes = '1'] = dia.split('-');
  const base = Date.UTC(Number(ano), Number(mes) - 1, Number(diaDoMes));
  const resultado = new Date(base + dias * 86_400_000);
  return formatar(
    resultado.getUTCFullYear(),
    resultado.getUTCMonth() + 1,
    resultado.getUTCDate(),
  );
}
