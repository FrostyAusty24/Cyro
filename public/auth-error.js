'use strict';
const errorRoot=document.querySelector('[data-auth-error]');
if(errorRoot&&window.CyroI18n){
  let params={};try{params=JSON.parse(errorRoot.getAttribute('data-error-params')||'{}');}catch{}
  window.CyroI18n.setText(document.getElementById('auth-error-message'),window.CyroI18n.text(errorRoot.getAttribute('data-error-key'),params));
  const select=document.getElementById('auth-error-language');
  for(const language of window.CyroI18n.languages){const option=document.createElement('option');option.value=language.id;option.textContent=language.name;option.selected=language.id===window.CyroI18n.locale;select.append(option);}
  select.addEventListener('change',()=>window.CyroI18n.setLocale(select.value));
}
