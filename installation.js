(()=>{'use strict';
 const overlay=document.querySelector('#installOverlay');if(!overlay)return;
 const dialog=overlay.querySelector('[role="dialog"]'),action=document.querySelector('#installAction'),status=document.querySelector('#installStatus'),instructions=document.querySelector('#installInstructions');
 let pending=null,previousFocus=null;
 const installed=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true||window.Capacitor?.isNativePlatform?.();
 const help=()=>{
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(installed())return'O aplicativo já está aberto como aplicativo instalado neste dispositivo.';
  if(ios)return'No iPhone ou iPad, abra este endereço no Safari. Toque em Compartilhar, escolha Adicionar à Tela de Início e confirme em Adicionar.';
  if(/Mac/.test(navigator.platform))return'No Mac, use Arquivo → Adicionar ao Dock no Safari, ou a opção Instalar no menu do Chrome ou Edge.';
  return'No Android, Windows ou Linux, abra este endereço no Chrome ou Edge e escolha Instalar aplicativo no menu do navegador. Quando disponível, use o botão abaixo.';
 };
 const update=()=>{instructions.textContent=help();action.hidden=!pending||!!installed();};
 const close=()=>{overlay.hidden=true;previousFocus?.focus();};
 for(const button of document.querySelectorAll('[data-install-help]'))button.addEventListener('click',()=>{previousFocus=button;status.textContent='';update();overlay.hidden=false;document.querySelector('#installClose').focus();});
 document.querySelector('#installClose').addEventListener('click',close);
 overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
 overlay.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();close();return;}
  if(event.key!=='Tab')return;
  const buttons=[...dialog.querySelectorAll('button,summary,a[href]')].filter(button=>!button.hidden&&!button.disabled),first=buttons[0],last=buttons.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 });
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending=event;update();});
 window.addEventListener('appinstalled',()=>{pending=null;status.textContent='Aplicativo instalado.';update();});
 action.addEventListener('click',async()=>{
  if(!pending)return;const request=pending;pending=null;action.disabled=true;
  try{await request.prompt();const choice=await request.userChoice;status.textContent=choice?.outcome==='accepted'?'Instalação solicitada. Conclua a confirmação do navegador.':'Instalação cancelada. Você também pode instalar pelo menu do navegador.';}
  catch{status.textContent='Use a opção Instalar no menu do navegador.';}
  finally{action.disabled=false;update();}
 });
})();
