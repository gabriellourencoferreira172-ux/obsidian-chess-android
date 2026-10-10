/* Obsidian Chess v2 — regras via chess.js, IA minimax local e PWA */
(() => {
"use strict";
const $ = id => document.getElementById(id);
const files = "abcdefgh";
const pieceImages = {w:{k:"pieces/wk.png",q:"pieces/wq.png",r:"pieces/wr.png",b:"pieces/wb.png",n:"pieces/wn.png",p:"pieces/wp.png"},b:{k:"pieces/bk.png",q:"pieces/bq.png",r:"pieces/br.png",b:"pieces/bb.png",n:"pieces/bn.png",p:"pieces/bp.png"}};
const values={p:100,n:320,b:330,r:500,q:900,k:20000};
let game=null, selected=null, legalTargets=[], flipped=false,lastMove=null, pendingPromotion=null;
let mode="ai", humanColor="w", aiColor="b", difficulty="medium", clockSeconds=600, clocks={w:600,b:600}, clockInterval=null, lastTick=Date.now(), soundOn=true, audioCtx=null, gameEnded=false, aiThinking=false, lastResultCounted=false;
let toastTimer=null, tapCount=0, tapWindowStart=0, godMode=false;
let peer=null, peerConn=null, onlineRoomCode="", applyingRemote=false, onlineHost=false;
const STORAGE={wins:"obsidianWins",rating:"obsidianRating",sound:"obsidianSound",theme:"obsidianTheme",skin:"obsidianPieceSkin"};
const glyphs={w:{k:"♔",q:"♕",r:"♖",b:"♗",n:"♘",p:"♙"},b:{k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"}};
let pieceSkin="photo";

function init(){
 if(typeof Chess==="undefined"){$("statusTitle").textContent="Biblioteca indisponível";$("statusSub").textContent="Confira sua conexão e recarregue a página.";return;}
 game=new Chess();
 $("newGameBtn").addEventListener("click",()=>openSetup());
 $("undoBtn").addEventListener("click",undoMove);
 $("flipBtn").addEventListener("click",()=>{flipped=!flipped;renderBoard();});
 pieceSkin=localStorage.getItem(STORAGE.skin)||"photo";$("pieceSkin").value=pieceSkin;$("pieceSkin").addEventListener("change",()=>{pieceSkin=$("pieceSkin").value;localStorage.setItem(STORAGE.skin,pieceSkin);renderBoard();showToast("Visual das peças atualizado.");});
 $("themeBtn").addEventListener("click",()=>{document.body.classList.toggle("light-mode");localStorage.setItem(STORAGE.theme,document.body.classList.contains("light-mode")?"light":"dark");});
 if(localStorage.getItem(STORAGE.theme)==="light")document.body.classList.add("light-mode");
 soundOn=localStorage.getItem(STORAGE.sound)!=="off";updateSoundButton();
 $("soundBtn").addEventListener("click",()=>{soundOn=!soundOn;localStorage.setItem(STORAGE.sound,soundOn?"on":"off");updateSoundButton();if(soundOn)playSound("move");});
 $("closeSetup").addEventListener("click",()=>{$("setupModal").hidden=true;});
 document.querySelectorAll(".mode-card").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".mode-card").forEach(b=>b.classList.remove("selected"));btn.classList.add("selected");mode=btn.dataset.mode;$("onlineNotice").hidden=mode!=="online";$("difficulty").disabled=mode!=="ai";$("sideChoice").disabled=mode!=="ai";}));
 $("startGameBtn").addEventListener("click",startConfiguredGame);
 $("cancelPromotion").addEventListener("click",cancelPromotion);
 document.querySelectorAll("[data-piece]").forEach(btn=>btn.addEventListener("click",()=>{if(!pendingPromotion)return;const m=pendingPromotion;pendingPromotion=null;$("promotionModal").hidden=true;makeMove({from:m.from,to:m.to,promotion:btn.dataset.piece});}));
 $("resultNewBtn").addEventListener("click",()=>{$("resultModal").hidden=true;openSetup();});
 $("resultCloseBtn").addEventListener("click",()=>$("resultModal").hidden=true);
 $("closeOnline").addEventListener("click",()=>$("onlineModal").hidden=true);
 $("copyInviteBtn").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(location.href);showToast("Link copiado. Compartilhe com seu amigo.");}catch(e){showToast("Copie o endereço desta página pelo navegador.");}});
 $("createRoomBtn").addEventListener("click",createOnlineRoom);
 $("joinRoomBtn").addEventListener("click",joinOnlineRoom);

 render();updateProfile();
 // Easter egg: 10 taps anywhere on the screen activate automatic play for the human side.
 document.addEventListener("pointerdown",()=>{
  const now=Date.now();
  if(!tapWindowStart||now-tapWindowStart>7000){tapWindowStart=now;tapCount=0;}
  tapCount++;
  if(tapCount>=10){tapCount=0;tapWindowStart=0;activateGodMode();}
 },{passive:true});
 // Start with the configuration dialog, so players choose a mode.
 $("setupModal").hidden=false;
 if("serviceWorker" in navigator && location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
function openSetup(){pauseClock();godMode=false;$("setupModal").hidden=false;$("resultModal").hidden=true;}
function activateGodMode(){
 if((mode!=="ai"&&mode!=="online")||gameEnded||!game||$("setupModal").hidden===false){showToast("Inicie uma partida contra a IA ou entre em uma sala online para ativar o GOD MODE.");return;}
 if(godMode){showToast("GOD MODE já está ativado. 😈");return;}
 godMode=true;difficulty="hard";$("modeLabel").textContent="GOD MODE";$("gameType").textContent=mode==="online"?"GOD MODE · SALA "+onlineRoomCode:"OBSIDIAN GOD MODE";$("gameSub").textContent=mode==="online"?"Bot automático ativado · suas jogadas são enviadas ao adversário":"Bot automático ativado · busca leve local";
 showToast(mode==="online"?"⚡ GOD MODE ONLINE ATIVADO!":"⚡ GOD MODE ATIVADO! O bot joga por você.");
 if(game.turn()===humanColor)window.setTimeout(makeGodMove,250);
}
function startConfiguredGame(){
 mode=document.querySelector(".mode-card.selected")?.dataset.mode||"ai";
 difficulty=$("difficulty").value;
 clockSeconds=Number($("timeControl").value)*60;
 const side=$("sideChoice").value;
 humanColor=side==="random"?(Math.random()<.5?"w":"b"):side; aiColor=humanColor==="w"?"b":"w";
 if(mode==="online"){$("setupModal").hidden=true;$("onlineModal").hidden=false;return;}
 game.reset();selected=null;legalTargets=[];lastMove=null;flipped=humanColor==="b"&&mode==="ai";clocks={w:clockSeconds,b:clockSeconds};gameEnded=false;aiThinking=false;lastResultCounted=false;
 $("setupModal").hidden=true;$("resultModal").hidden=true;
 $("modeLabel").textContent=mode==="ai"?"CONTRA IA":"JOGO LOCAL";
 $("gameType").textContent=mode==="ai"?"DESAFIO CONTRA IA":"PARTIDA LOCAL";
 $("gameSub").textContent=clockSeconds?`${clockSeconds/60} min · ${mode==="ai"?"Computador":"2 jogadores"}`:`Sem relógio · ${mode==="ai"?"Computador":"2 jogadores"}`;
 if(mode==="ai"){ $("topPlayer").textContent=aiColor==="b"?"Obsidian AI":"Você";$("bottomPlayer").textContent=humanColor==="w"?"Você":"Obsidian AI"; }
 else {$("topPlayer").textContent="Jogador das Pretas";$("bottomPlayer").textContent="Jogador das Brancas";}
 $("topAvatar").textContent="♚";$("bottomAvatar").textContent="♔";
 lastTick=Date.now();startClock();render();if(mode==="ai"&&game.turn()===aiColor)window.setTimeout(makeAIMove,350);
}
function startClock(){pauseClock();updateClocks();if(!clockSeconds)return;lastTick=Date.now();clockInterval=setInterval(()=>{if(gameEnded||$("setupModal").hidden===false||aiThinking&&game.turn()===aiColor)return;const now=Date.now();const elapsed=(now-lastTick)/1000;lastTick=now;const color=game.turn();clocks[color]=Math.max(0,clocks[color]-elapsed);updateClocks();if(clocks[color]<=0){gameEnded=true;pauseClock();showResult("Tempo esgotado",`${color==="w"?"Brancas":"Pretas"} perderam no tempo.`, "⏱");}},200);}
function pauseClock(){if(clockInterval){clearInterval(clockInterval);clockInterval=null;}}
function updateClocks(){["w","b"].forEach(c=>{const el=$(c==="w"?"whiteClock":"blackClock");el.textContent=formatTime(clocks[c]);el.classList.toggle("active-clock",!!clockSeconds&&!gameEnded&&game.turn()===c);});}
function formatTime(s){if(!clockSeconds)return "—:—";s=Math.ceil(s);return `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;}
function undoMove(){
 if(!game.history().length||gameEnded)return;
 if(mode==="ai"){game.undo();if(game.history().length&&game.turn()===aiColor)game.undo();}
 else game.undo();
 const hist=game.history({verbose:true});lastMove=hist.length?{from:hist[hist.length-1].from,to:hist[hist.length-1].to}:null;selected=null;legalTargets=[];aiThinking=false;render();showToast("Último movimento desfeito.");
}
function squareName(row,col){return files[col]+(8-row);}
function render(){renderBoard();renderStatus();renderHistory();renderCaptured();$("moveCount").textContent=game.history().length;$("captureCount").textContent=game.history({verbose:true}).filter(m=>m.captured).length;$("historyCount").textContent=`${Math.ceil(game.history().length/2)} ${game.history().length===1?"lance":"lances"}`;$("undoBtn").disabled=!game.history().length||gameEnded;$("undoBtn").style.opacity=$("undoBtn").disabled?".45":"1";updateClocks();}
function renderBoard(){
 const el=$("board");el.innerHTML="";const board=game.board();let rows=[0,1,2,3,4,5,6,7],cols=[0,1,2,3,4,5,6,7];if(flipped){rows.reverse();cols.reverse();}
 rows.forEach(row=>cols.forEach(col=>{const sq=board[row][col],name=squareName(row,col),cell=document.createElement("button");cell.type="button";cell.className=`square ${(row+col)%2===0?"light":"dark"}`;cell.dataset.square=name;cell.setAttribute("role","gridcell");cell.setAttribute("aria-label",`${name}${sq?", "+(sq.color==="w"?"brancas ":"pretas ")+sq.type:""}`);if(selected===name)cell.classList.add("selected");if(lastMove&&(lastMove.from===name||lastMove.to===name))cell.classList.add("last-move");if(legalTargets.includes(name))cell.classList.add(game.get(name)?"capture":"legal");if(sq&&sq.type==="k"&&sq.color===game.turn()&&game.in_check())cell.classList.add("in-check");
 if(sq){if(pieceSkin==="photo"){const p=document.createElement("img");p.className=`piece piece-photo ${sq.color==="w"?"white":"black"}`;p.src=pieceImages[sq.color][sq.type];p.alt=({k:"Rei",q:"Rainha",r:"Torre",b:"Bispo",n:"Cavalo",p:"Peão"})[sq.type]+(sq.color==="w"?" branco":" preto");p.draggable=false;cell.appendChild(p);}else{const p=document.createElement("span");p.className=`piece piece-glyph ${pieceSkin==="minimal"?"minimal-glyph":""} ${sq.color==="w"?"glyph-white":"glyph-black"}`;p.textContent=glyphs[sq.color][sq.type];cell.appendChild(p);}}
 if((!flipped&&col===0)||(flipped&&col===7)){const rank=document.createElement("span");rank.className="coords coord-rank";rank.textContent=8-row;cell.appendChild(rank);}
 if((!flipped&&row===7)||(flipped&&row===0)){const file=document.createElement("span");file.className="coords coord-file";file.textContent=files[col];cell.appendChild(file);}
 cell.addEventListener("click",()=>onSquareClick(name));el.appendChild(cell);}));
 $("fileBottom").innerHTML="";const displayFiles=flipped?[...files].reverse():[...files];displayFiles.forEach(f=>{const s=document.createElement("span");s.textContent=f;$("fileBottom").appendChild(s);});
}
function onSquareClick(name){
 if(gameEnded||aiThinking)return;
 if((mode==="ai"||mode==="online")&&game.turn()!==humanColor){showToast("Aguarde a jogada do adversário.");return;}
 if(game.game_over()){finishGame();return;}
 const piece=game.get(name);
 if(selected&&legalTargets.includes(name)){const moving=game.get(selected);if(moving&&moving.type==="p"&&((moving.color==="w"&&name[1]==="8")||(moving.color==="b"&&name[1]==="1"))){pendingPromotion={from:selected,to:name};$("promotionModal").hidden=false;return;}makeMove({from:selected,to:name});return;}
 if(piece&&piece.color===game.turn()){selected=name;legalTargets=game.moves({square:name,verbose:true}).map(m=>m.to);renderBoard();return;}
 selected=null;legalTargets=[];renderBoard();
}
function makeMove(move){
 try{const result=game.move(move);if(!result){showToast("Movimento inválido.");return;}lastMove={from:result.from,to:result.to};selected=null;legalTargets=[];playSound(result.flags.includes("c")||result.flags.includes("e")?"capture":"move");if(result.san.includes("+")||result.san.includes("#"))playSound("check");render();if(mode==="online")publishOnlineState();if(game.game_over()){finishGame();return;}if((mode==="ai"||mode==="online")&&godMode&&game.turn()===humanColor){aiThinking=true;window.setTimeout(makeGodMove,120);}else if(mode==="ai"&&game.turn()===aiColor){aiThinking=true;$("statusTitle").textContent="Obsidian AI pensando…";$("statusSub").textContent="Calculando respostas possíveis.";window.setTimeout(makeAIMove,120);}else lastTick=Date.now();}catch(e){showToast("Esse movimento não é permitido.");}
}
function setOnlineStatus(title,message){const el=$("onlineRoomStatus");if(!el)return;el.innerHTML="";const strong=document.createElement("strong"),span=document.createElement("span");strong.textContent=title;span.textContent=message;el.append(strong,span);}
function closePeer(){try{if(peerConn){peerConn.close();peerConn=null;}}catch(e){}try{if(peer){peer.destroy();peer=null;}}catch(e){}}
function startOnlineGame(color,roomCode){mode="online";humanColor=color;aiColor=color==="w"?"b":"w";onlineRoomCode=roomCode;game=new Chess();selected=null;legalTargets=[];lastMove=null;flipped=color==="b";clocks={w:clockSeconds,b:clockSeconds};gameEnded=false;aiThinking=false;lastResultCounted=false;$("onlineModal").hidden=true;$("setupModal").hidden=true;$("resultModal").hidden=true;$("modeLabel").textContent="MULTIPLAYER ONLINE";$("gameType").textContent="SALA "+roomCode;$("gameSub").textContent="Você joga de "+(color==="w"?"brancas":"pretas");$("topPlayer").textContent=color==="w"?"Amigo · Pretas":"Você · Pretas";$("bottomPlayer").textContent=color==="w"?"Você · Brancas":"Amigo · Brancas";lastTick=Date.now();startClock();render();}
function createOnlineRoom(){
 if(typeof Peer==="undefined"){setOnlineStatus("Serviço indisponível","Não foi possível carregar a conexão online. Recarregue o site e tente novamente.");return;}
 closePeer();const code=Math.random().toString(36).slice(2,8).toUpperCase();const peerId="obsidianchess-"+code.toLowerCase();setOnlineStatus("Criando sala…","Aguarde enquanto conectamos à internet.");
 try{peer=new Peer(peerId);peer.on("open",()=>{onlineHost=true;onlineRoomCode=code;$("roomCodeInput").value=code;startOnlineGame("w",code);setOnlineStatus("Sala criada: "+code,"Envie o código ao amigo. Mantenha esta página aberta até ele entrar.");showToast("Sala online criada: "+code);});peer.on("connection",conn=>{if(peerConn){conn.close();return;}peerConn=conn;wirePeerConnection(conn,true);});peer.on("error",err=>{setOnlineStatus("Não foi possível criar a sala",err.type==="unavailable-id"?"Tente criar outra sala.":"O serviço de conexão pode estar indisponível. Tente novamente em instantes.");});peer.on("disconnected",()=>setOnlineStatus("Conexão interrompida","Confira a internet e tente recriar a sala."));}catch(e){setOnlineStatus("Erro de conexão","Recarregue o site e tente novamente.");}
}
function joinOnlineRoom(){
 if(typeof Peer==="undefined"){setOnlineStatus("Serviço indisponível","Não foi possível carregar a conexão online. Recarregue o site e tente novamente.");return;}
 const code=$("roomCodeInput").value.trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(code)){setOnlineStatus("Código inválido","Digite o código de 6 caracteres enviado pelo seu amigo.");return;}closePeer();setOnlineStatus("Entrando na sala…","Tentando conectar ao anfitrião.");
 try{peer=new Peer();peer.on("open",()=>{const conn=peer.connect("obsidianchess-"+code.toLowerCase(),{reliable:true});peerConn=conn;wirePeerConnection(conn,false);});peer.on("error",err=>{setOnlineStatus("Não foi possível entrar",err.type==="peer-unavailable"?"Sala não encontrada. Confira o código e veja se o anfitrião continua com o jogo aberto.":"O serviço de conexão pode estar indisponível. Tente novamente.");});}catch(e){setOnlineStatus("Erro de conexão","Recarregue o site e tente novamente.");}
}
function wirePeerConnection(conn,isHost){
 conn.on("open",()=>{onlineHost=isHost;if(isHost){setOnlineStatus("Amigo conectado!","Partida iniciada. Você joga com as brancas.");conn.send({type:"state",moves:game.history({verbose:true}).map(m=>({from:m.from,to:m.to,promotion:m.promotion||null}))});}else{startOnlineGame("b",onlineRoomCode||$("roomCodeInput").value.trim().toUpperCase());setOnlineStatus("Conectado!","Você joga com as pretas.");}showToast("Conexão multiplayer estabelecida!");});
 conn.on("data",msg=>{if(!msg||msg.type!=="state"||!Array.isArray(msg.moves))return;applyOnlineMoves(msg.moves);});
 conn.on("close",()=>{setOnlineStatus("Amigo desconectado","A conexão foi encerrada. Peça para ele reabrir o jogo.");showToast("O outro jogador desconectou.");});
 conn.on("error",()=>setOnlineStatus("Conexão instável","Confira a internet nos dois celulares."));
}
function publishOnlineState(){if(!peerConn||!peerConn.open||applyingRemote)return;const moves=game.history({verbose:true}).map(m=>({from:m.from,to:m.to,promotion:m.promotion||null}));try{peerConn.send({type:"state",moves});}catch(e){showToast("Falha ao enviar a jogada. Confira a conexão.");}}
function applyOnlineMoves(moves){const signature=a=>a.map(m=>m.from+m.to+(m.promotion||"")).join(",");const current=game.history({verbose:true}).map(m=>({from:m.from,to:m.to,promotion:m.promotion||null}));if(signature(current)===signature(moves))return;applyingRemote=true;try{const fresh=new Chess();for(const m of moves){if(!fresh.move({from:m.from,to:m.to,promotion:m.promotion||"q"}))throw new Error("invalid move");}game=fresh;const hist=game.history({verbose:true});lastMove=hist.length?{from:hist[hist.length-1].from,to:hist[hist.length-1].to}:null;selected=null;legalTargets=[];render();if(game.game_over())finishGame();else if(godMode&&mode==="online"&&game.turn()===humanColor){aiThinking=true;window.setTimeout(makeGodMove,180);}}catch(e){console.warn("Estado remoto inválido",e);}finally{applyingRemote=false;}}
function cancelPromotion(){pendingPromotion=null;$("promotionModal").hidden=true;}
function renderStatus(){
 let title=game.turn()==="w"?"Brancas jogam":"Pretas jogam",sub=game.turn()==="w"?"É a vez das brancas.":"É a vez das pretas.",symbol=game.turn()==="w"?"♙":"♟";
 if(aiThinking){title="Obsidian AI pensando…";sub="Calculando respostas possíveis.";symbol="♞";}
 else if(game.in_checkmate()){title="Xeque-mate";sub=`${game.turn()==="w"?"Brancas":"Pretas"} sem movimentos possíveis.`;symbol="♛";}
 else if(game.in_stalemate()){title="Afogamento";sub="Empate por falta de movimentos legais.";symbol="＝";}
 else if(game.in_threefold_repetition()){title="Repetição tripla";sub="A posição se repetiu três vezes.";symbol="↻";}
 else if(game.insufficient_material()){title="Material insuficiente";sub="Empate: não há peças suficientes.";symbol="＝";}
 else if(game.in_draw()){title="Partida empatada";sub="A partida terminou em empate.";symbol="＝";}
 else if(game.in_check()){title="Xeque!";sub=`O rei das ${game.turn()==="w"?"brancas":"pretas"} está ameaçado.`;symbol="⚠";}
 $("statusTitle").textContent=title;$("statusSub").textContent=sub;$("statusSymbol").textContent=symbol;
 $("turnLabel").textContent=gameEnded?"Partida encerrada":aiThinking?"Computador pensando…":mode==="ai"?(game.turn()===humanColor?"Sua vez de jogar":"Vez do computador"):(game.turn()==="w"?"Vez das brancas":"Vez das pretas");
 $("topSub").textContent=game.turn()==="b"&&!gameEnded?"Jogando agora":"Aguardando"; 
}
function renderHistory(){const el=$("moveHistory"),h=game.history({verbose:true});if(!h.length){el.innerHTML='<div class="empty-history"><span>♘</span><strong>A história começa aqui.</strong><small>Faça seu primeiro movimento.</small></div>';return;}el.innerHTML="";for(let i=0;i<h.length;i+=2){const row=document.createElement("div");row.className="move-row";const num=document.createElement("span");num.className="move-number";num.textContent=`${Math.floor(i/2)+1}.`;const w=document.createElement("span");w.className="move-san";w.textContent=h[i].san;if(i===h.length-1)w.classList.add("latest");row.append(num,w);const b=document.createElement("span");b.className="move-san";if(h[i+1]){b.textContent=h[i+1].san;if(i+1===h.length-1)b.classList.add("latest");}row.appendChild(b);el.appendChild(row);}el.scrollTop=el.scrollHeight;}
function renderCaptured(){const h=game.history({verbose:true}),wc=[],bc=[];h.forEach(m=>{if(m.captured)(m.color==="w"?wc:bc).push({color:m.color==="w"?"b":"w",type:m.captured});});const order={q:0,r:1,b:2,n:3,p:4,k:5};wc.sort((a,b)=>order[a.type]-order[b.type]);bc.sort((a,b)=>order[a.type]-order[b.type]);$("whiteCaptured").innerHTML=wc.length?wc.map(p=>`<span class="${p.color==="w"?"captured-white":"captured-black"}">${glyphs[p.color][p.type]}</span>`).join(""):"—";$("blackCaptured").innerHTML=bc.length?bc.map(p=>`<span class="${p.color==="w"?"captured-white":"captured-black"}">${glyphs[p.color][p.type]}</span>`).join(""):"—";}
function finishGame(){
 if(gameEnded)return;gameEnded=true;aiThinking=false;pauseClock();render();let title="Partida empatada",text="Boa partida. O empate também faz parte do xadrez.",icon="＝";
 if(game.in_checkmate()){const winner=game.turn()==="w"?"b":"w";title=winner===humanColor&&mode==="ai"?"Você venceu!":mode==="ai"?"A IA venceu":"Xeque-mate";text=`${winner==="w"?"Brancas":"Pretas"} venceram por xeque-mate.`;icon="♛";playSound("win");if(mode==="ai"){const oldRating=Number(localStorage.getItem(STORAGE.rating)||800);const aiRating= difficulty==="easy"?700:difficulty==="hard"?1500:1100;const expected=1/(1+Math.pow(10,(aiRating-oldRating)/400));const score=winner===humanColor?1:0;const next=Math.max(100,Math.min(3000,Math.round(oldRating+24*(score-expected))));localStorage.setItem(STORAGE.rating,String(next));if(winner===humanColor)localStorage.setItem(STORAGE.wins,String(Number(localStorage.getItem(STORAGE.wins)||0)+1));}else if(mode==="local"&&winner===humanColor){localStorage.setItem(STORAGE.wins,String(Number(localStorage.getItem(STORAGE.wins)||0)+1));}}
 else if(clocks.w<=0||clocks.b<=0){const loser=clocks.w<=0?"w":"b";title=loser===humanColor&&mode==="ai"?"Tempo esgotado":"Fim de tempo";text=`${loser==="w"?"Brancas":"Pretas"} perderam no tempo.`;icon="⏱";}
 else if(game.in_stalemate()){title="Afogamento";text="Empate por afogamento.";icon="＝";}
 else if(game.in_threefold_repetition()){title="Repetição tripla";text="A posição se repetiu três vezes.";icon="↻";}
 else if(game.insufficient_material()){title="Material insuficiente";text="Empate por material insuficiente.";icon="＝";}
 else if(game.in_draw()){title="Empate";text="A partida terminou empatada.";icon="＝";}
 updateProfile();$("resultTitle").textContent=title;$("resultText").textContent=text;$("resultIcon").textContent=icon;$("resultModal").hidden=false;
}
function showResult(title,text,icon){$("resultTitle").textContent=title;$("resultText").textContent=text;$("resultIcon").textContent=icon;$("resultModal").hidden=false;}
function updateProfile(){$("winsCount").textContent=localStorage.getItem(STORAGE.wins)||"0";$("ratingValue").textContent=localStorage.getItem(STORAGE.rating)||"800";}
function makeAIMove(){
 if(gameEnded||mode!=="ai"||game.turn()!==aiColor)return;aiThinking=true;renderStatus();
 // Keep the UI responsive; the search is deliberately capped for mobile devices.
 window.setTimeout(()=>{if(gameEnded)return;const move=chooseAIMove();aiThinking=false;if(move)makeMove(move);else finishGame();},80);
}
function makeGodMove(){
 if(gameEnded||(mode!=="ai"&&mode!=="online")||!godMode||game.turn()!==humanColor)return;
 aiThinking=true;renderStatus();
 // Lightweight search tuned for Android phones to avoid freezing the interface.
 window.setTimeout(()=>{if(gameEnded||!godMode)return;const oldColor=aiColor,oldDifficulty=difficulty;aiColor=humanColor;difficulty="hard";const move=chooseAIMove();aiColor=oldColor;difficulty=oldDifficulty;aiThinking=false;if(move)makeMove(move);else finishGame();},80);
}
function chooseAIMove(){
 const moves=game.moves({verbose:true});if(!moves.length)return null;
 if(difficulty==="easy"){return moves[Math.floor(Math.random()*moves.length)];}
 const depth=2; // Fast search: keep the phone responsive, including in GOD MODE.
 let best=[],bestScore=-Infinity;
 // Alpha-beta minimax evaluates from the AI side and uses a tiny random tie-break.
 for(const m of shuffle(moves)){game.move(m);const score=minimax(depth-1,-Infinity,Infinity,false);game.undo();const adjusted=score+(Math.random()*.12);if(adjusted>bestScore){bestScore=adjusted;best=[m];}else if(Math.abs(adjusted-bestScore)<.15)best.push(m);}
 return best[Math.floor(Math.random()*best.length)];
}
function minimax(depth,alpha,beta,maximizing){
 if(depth===0||game.game_over())return evaluatePosition();
 const moves=game.moves({verbose:true});
 if(maximizing){let best=-Infinity;for(const m of moves){game.move(m);best=Math.max(best,minimax(depth-1,alpha,beta,false));game.undo();alpha=Math.max(alpha,best);if(beta<=alpha)break;}return best;}
 let best=Infinity;for(const m of moves){game.move(m);best=Math.min(best,minimax(depth-1,alpha,beta,true));game.undo();beta=Math.min(beta,best);if(beta<=alpha)break;}return best;
}
function evaluatePosition(){
 if(game.in_checkmate())return game.turn()===aiColor?-100000:100000;
 if(game.in_draw())return 0;
 const b=game.board();let score=0;
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=b[r][c];if(!p)continue;let v=values[p.type];const advance=p.color==="w"?6-r:r-1;
 if(p.type==="p")v+=advance*8+(c>=2&&c<=5?8:0);
 if(p.type==="n"||p.type==="b"){const center=3.5-Math.abs(3.5-c)+3.5-Math.abs(3.5-r);v+=center*5;}
 if(p.type==="k"&&game.history().length>25){v+=((3.5-Math.abs(3.5-c))+(3.5-Math.abs(3.5-r)))*4;}
 score+=(p.color===aiColor?v:-v);}
 if(game.in_check())score+=game.turn()===aiColor?-35:35;
 return score;
}
function shuffle(a){return a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);}
function updateSoundButton(){$("soundBtn").textContent=soundOn?"♫":"♪";$("soundBtn").style.opacity=soundOn?"1":".55";}
function playSound(type){if(!soundOn)return;try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();const now=audioCtx.currentTime;const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.connect(gain);gain.connect(audioCtx.destination);const tones={move:[480,.07],capture:[240,.13],check:[740,.12],win:[660,.24]};const [freq,dur]=tones[type]||tones.move;osc.type=type==="capture"?"triangle":"sine";osc.frequency.setValueAtTime(freq,now);if(type==="win")osc.frequency.linearRampToValueAtTime(990,now+dur);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.08,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+dur);osc.start(now);osc.stop(now+dur+.02);}catch(e){}}
function showToast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2800);}
init();
})();