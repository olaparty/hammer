var E=Object.create;var f=Object.defineProperty;var I=Object.getOwnPropertyDescriptor;var T=Object.getOwnPropertyNames;var M=Object.getPrototypeOf,U=Object.prototype.hasOwnProperty;var W=(t,e)=>{for(var s in e)f(t,s,{get:e[s],enumerable:!0})},y=(t,e,s,p)=>{if(e&&typeof e=="object"||typeof e=="function")for(let a of T(e))!U.call(t,a)&&a!==s&&f(t,a,{get:()=>e[a],enumerable:!(p=I(e,a))||p.enumerable});return t};var x=(t,e,s)=>(s=t!=null?E(M(t)):{},y(e||!t||!t.__esModule?f(s,"default",{value:t,enumerable:!0}):s,t)),$=t=>y(f({},"__esModule",{value:!0}),t);var m=(t,e,s)=>new Promise((p,a)=>{var w=o=>{try{v(s.next(o))}catch(d){a(d)}},g=o=>{try{v(s.throw(o))}catch(d){a(d)}},v=o=>o.done?p(o.value):Promise.resolve(o.value).then(w,g);v((s=s.apply(t,e)).next())});var H={};W(H,{default:()=>B});module.exports=$(H);var n=x(require("vscode")),j=x(require("path")),S=require("@flutter-preview/analyzer");var C=require("@flutter-preview/core");var i=class{static get instance(){return i._instance||(i._instance=new i),i._instance}constructor(){}init(e,s){if(!i.project)i.project=new C.FlutterPreviewProject({origin:e,target:s});else{if(i.project.origin!==e)throw new Error("Cannot change project path");this.target(s)}return i.project}target(e){return m(this,null,function*(){i.project.target(e),this.restart()})}restart(){return m(this,null,function*(){yield i.project.restart()})}webLaunchUrl(){return m(this,null,function*(){return yield i.project.webLaunchUrl()})}};var b=require("@flutter-preview/webview"),A=require("pubspec");var R=["dart"],L="https://flutter-preview.vercel.app/app",u=class{get commandId(){return`${this.namespace}.showPreview`}constructor({namespace:e}){this.namespace=e}attatch(e){let s=n.commands.registerCommand(this.commandId,z);n.languages.registerCodeLensProvider(R,{provideCodeLenses:p=>m(this,null,function*(){let a=p.getText();return(yield new S.Analyzer(a).widgets()).map(o=>o.constructors.map(d=>{let r=[p,o.id,d.name];if(!d.analysis.requires_arguments&&d.name===o.name&&d.name===o.name){let c=p.positionAt(o.start+2);return new n.CodeLens(new n.Range(c,c),{command:this.commandId,arguments:r,title:`\u26A1\uFE0F Preview ${o.name}`})}})).flat().filter(Boolean)})}),e.subscriptions.push(s)}detach(){}};function z(t,e,s){return m(this,null,function*(){let p=`Preview: ${e}`,a=n.window.createWebviewPanel("flutter-preview",p,n.ViewColumn.Beside,{enableScripts:!0,retainContextWhenHidden:!0});a.webview.html=P({name:p,iframe:(0,b.appurl)(null,L)});let w={restart:()=>m(this,null,function*(){a.webview.postMessage({type:"hot-restart"})}),webLaunchUrl:r=>m(this,null,function*(){a.webview.postMessage({type:"web-launch-url",url:r})}),startupLog:r=>{a.webview.postMessage({type:"daemon-startup-log",message:r})},appStop:r=>{a.webview.postMessage({type:"app.stop",error:r})}},g=i.instance,v=j.default.dirname(t.fileName),o=(0,A.locatePubspec)(v);if(o){let{base_dir:r}=o,c=g.init(r,{path:t.fileName,identifier:e,constructor:s});console.log("daemon project initiallized",{id:c.client.id}),c.run(),c.on("message",l=>{l.trim().split(`
`).forEach(h=>{h.startsWith("[")||h.endsWith("]")||(console.log("daemon log",h),w.startupLog(h))})}),c.on("app.log",l=>{console.log("app.log",l)}),c.on("app.stop",l=>{n.window.showErrorMessage("Compile failed"),w.appStop(`Process with id ${l.appId} has stopped due to internal error (Dart Compiled failed)`)})}else{n.window.showErrorMessage("Cannot find pubspec.yaml");return}let d=n.workspace.onDidSaveTextDocument(r=>m(this,null,function*(){yield g.restart(),w.restart()}));g.webLaunchUrl().then(r=>{console.info("webLaunchUrl ready",r),a.webview.html=P({name:p,iframe:(0,b.appurl)({webLaunchUrl:r},L)})}),a.webview.onDidReceiveMessage(r=>{switch(console.log("vscode recieved message from app",r),r.command){case"vscode.env.openExternal":{let{target:c}=r;n.env.openExternal(n.Uri.parse(c));break}}}),a.onDidDispose(()=>{d.dispose()})})}function P({name:t,iframe:e}){return`<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://flutter-preview.webview.vscode.grida.co/app" />
		<title>${t}</title>
    <script>
    
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
    </script>
	</head>
	<body style="margin: 0; padding: 0; width: 100%; height: 100vh; overflow: hidden;">
    <iframe
      id="app"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      src="${e}"
      style="width: 100%; height: 100%; border: none;">
    </iframe>
	</body>
	</html>`}var B=u;
