export function el(tag, attrs = {}, filhos = []) {
  const node = document.createElement(tag);
  for (const [chave, valor] of Object.entries(attrs)) {
    if (chave === 'class') node.className = valor;
    else if (chave === 'html') node.innerHTML = valor;
    else if (chave.startsWith('on') && typeof valor === 'function') {
      node.addEventListener(chave.slice(2).toLowerCase(), valor);
    } else if (valor !== undefined && valor !== null && valor !== false) {
      node.setAttribute(chave, valor === true ? '' : valor);
    }
  }
  const lista = Array.isArray(filhos) ? filhos : [filhos];
  for (const filho of lista) {
    if (filho === null || filho === undefined || filho === false) continue;
    node.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  }
  return node;
}

export function hojeISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz * 60000);
  return local.toISOString().slice(0, 10);
}

export function formatarDataBR(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

let toastTimeout = null;
export function mostrarToast(msg) {
  let node = document.getElementById('toast-global');
  if (!node) {
    node = el('div', { class: 'toast', id: 'toast-global' });
    document.body.appendChild(node);
  }
  node.textContent = msg;
  node.style.display = 'block';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    node.style.display = 'none';
  }, 2200);
}

export function limpar(container) {
  container.innerHTML = '';
}
