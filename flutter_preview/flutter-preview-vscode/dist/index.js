var k=Object.create;var j=Object.defineProperty;var B=Object.getOwnPropertyDescriptor;var z=Object.getOwnPropertyNames;var H=Object.getPrototypeOf,N=Object.prototype.hasOwnProperty;var R=(n,e)=>{for(var o in e)j(n,o,{get:e[o],enumerable:!0})},S=(n,e,o,p)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of z(e))!N.call(n,s)&&s!==o&&j(n,s,{get:()=>e[s],enumerable:!(p=B(e,s))||p.enumerable});return n};var A=(n,e,o)=>(o=n!=null?k(H(n)):{},S(e||!n||!n.__esModule?j(o,"default",{value:n,enumerable:!0}):o,n)),V=n=>S(j({},"__esModule",{value:!0}),n);var m=(n,e,o)=>new Promise((p,s)=>{var v=r=>{try{u(o.next(r))}catch(l){s(l)}},h=r=>{try{u(o.throw(r))}catch(l){s(l)}},u=r=>r.done?p(r.value):Promise.resolve(r.value).then(v,h);u((o=o.apply(n,e)).next())});var J={};R(J,{default:()=>D});module.exports=V(J);var a=A(require("vscode")),U=A(require("path")),I=require("@flutter-preview/analyzer");var M=require("@flutter-preview/core");var i=class{static get instance(){return i._instance||(i._instance=new i),i._instance}constructor(){}init(e,o){if(!i.project)i.project=new M.FlutterPreviewProject({origin:e,target:o});else{if(i.project.origin!==e)throw new Error("Cannot change project path");this.target(o)}return i.project}target(e){return m(this,null,function*(){console.log("target call","targetIdentifier"),i.project.target(e),this.restart()})}restart(){return m(this,null,function*(){yield i.project.restart()})}webLaunchUrl(){return m(this,null,function*(){return yield i.project.webLaunchUrl()})}};var x=require("@flutter-preview/webview"),$=require("pubspec");var _=["dart"],C="https://flutter-preview.vercel.app/app",P=class{get commandId(){return`${this.namespace}.showPreview`}constructor({namespace:e}){this.namespace=e}attatch(e){let o=a.commands.registerCommand(this.commandId,q);console.log("attach start"),a.languages.registerCodeLensProvider(_,{provideCodeLenses:p=>m(this,null,function*(){let s=p.getText();return(yield new I.Analyzer(s).widgets()).map(r=>r.constructors.map(l=>{let b=[p,r.id,l.name];if(l.name===r.name&&l.name===r.name){let g=p.positionAt(r.start+2);return new a.CodeLens(new a.Range(g,g),{command:this.commandId,arguments:b,title:`\u26A1\uFE0F Preview ${r.name}`})}})).flat().filter(Boolean)})}),e.subscriptions.push(o)}detach(){}};function q(n,e,o){return m(this,null,function*(){let p=`Preview: ${e}`,s=a.window.createWebviewPanel("flutter-preview",p,a.ViewColumn.Beside,{enableScripts:!0,retainContextWhenHidden:!0}),v="";s.webview.html=T({name:p,iframe:(0,x.appurl)(null,C),controlUI:v});let h={restart:()=>m(this,null,function*(){s.webview.postMessage({type:"hot-restart"})}),webLaunchUrl:t=>m(this,null,function*(){s.webview.postMessage({type:"web-launch-url",url:t})}),startupLog:t=>{s.webview.postMessage({type:"daemon-startup-log",message:t})},appStop:t=>{s.webview.postMessage({type:"app.stop",error:t})}};function u(t,w){var d;if(typeof t!="object"||t===null)throw new Error("Input is not a valid object.");let c="";for(let y in t)if(t.hasOwnProperty(y)){let f=t[y];((d=w.filter(W=>W.name===y)[0])==null?void 0:d.type)==="String"?c+=`${y}:'${f}',`:c+=`${y}:${f},`}return c.slice(0,-1)}let l=yield new I.Analyzer(n.getText()).widgets().filter(t=>t.id===e)[0].constructors[0].parameters;console.log("analysis",l);let b=new Map(l.map(t=>[t.name,null]));console.log("analysis logic",Array.from(b.keys())),v+='<div style="overflow-y:auto;">',Array.from(b.keys()).forEach((t,w)=>{console.log("analysis logic",t+" "+w.toString()),v+=`<div><span>${t}:</span><input type="text" class="input_param" id="${t}" /></div>`}),v+='<button onclick="refresh()">refresh</button></div>';let g=i.instance,L=U.default.dirname(n.fileName),E=(0,$.locatePubspec)(L);if(E){let{base_dir:t}=E,w=g.init(t,{path:n.fileName,identifier:e,constructor:o,param:""});console.log("daemon project initiallized",{id:w.client.id}),w.run(),console.log("project run complete",{id:w.client.id}),w.on("message",c=>{c.trim().split(`
`).forEach(f=>{f.startsWith("[")||f.endsWith("]")||(console.log("daemon log",f),h.startupLog(f))})}),w.on("app.log",c=>{console.log("app.log",c)}),w.on("app.stop",c=>{a.window.showErrorMessage("Compile failed"),h.appStop(`Process with id ${c.appId} has stopped due to internal error (Dart Compiled failed)`)}),s.webview.onDidReceiveMessage(c=>{switch(console.log("vscode recieved message from app",c),c.command){case"vscode.env.openExternal":{let{target:d}=c;a.env.openExternal(a.Uri.parse(d));break}case"refresh":{console.log("proto data:",c.data);try{let d=u(c.data,l);console.log("proto param string:",d),m(this,null,function*(){console.log("restart trigger ~"),yield g.target({path:n.fileName,identifier:e,constructor:o,param:d}),h.restart()})}catch(d){console.log("proto data error:",d),a.window.showInformationMessage(d)}break}}})}else{a.window.showErrorMessage("Cannot find pubspec.yaml");return}let O=a.workspace.onDidSaveTextDocument(t=>m(this,null,function*(){yield g.restart(),h.restart()}));g.webLaunchUrl().then(t=>{console.info("webLaunchUrl ready",(0,x.appurl)({webLaunchUrl:t},C)),s.webview.html=T({name:p,iframe:(0,x.appurl)({webLaunchUrl:t},C),controlUI:v})}),s.onDidDispose(()=>{O.dispose()})})}function T({name:n,iframe:e,controlUI:o}){return`<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://flutter-preview.webview.vscode.grida.co/app" />
		<title>${n}</title>
    <script>

      const vscode = acquireVsCodeApi();
      // Proxy the message event to the inner iframe
      window.addEventListener('message', event => {
        const message = event.data; // The JSON data our extension sent  
        // get app
        const app = document.getElementById('app');
        // send message to app
        app.contentWindow.postMessage(message, '*');
      });

      // Proxy the message event from the inner iframe to the parent window
      const app = document.getElementById('app');
      app.contentWindow.addEventListener('message', event => {
        const message = event.data; // The JSON data our extension sent
        // send message to parent
        // 1. if vscode command
        if (message.command){
          window.parent.postMessage(message, '*');
        }
        // 2. if load complete
        if (message.event === 'webview-ready'){
          window.parent.postMessage(message, '*');
        }
      });

      // send message to plugin to refresh the whole UI
      // let vscode = null;
      function refresh() {
        document.getElementById("log_div").innerHTML = 'success';
        try{
          var input_collection = document.getElementsByClassName("input_param");
          var dataObject = {};
          for (let i = 0; i < input_collection.length; i++) {
            dataObject[input_collection[i].id] = input_collection[i].value;
          }
          // if(vscode === null) {
          //   vscode = acquireVsCodeApi();
          // }
          vscode.postMessage({command:'refresh',data:dataObject});
        } catch(e) {
          document.getElementById("log_div").innerHTML = e.toString();
        }
      }
    </script>
	</head>
	<body style="margin: 0; padding: 0; width: 100%; height: 100vh; overflow: hidden;">
    <iframe
      id="app"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      src="${e}"
      style="width: 100%; height: 80%; border: none;">
    </iframe>
    <div>
      ${o}
    </div>
    <div id="log_div"'></div>
	</body>
	</html>`}var D=P;
