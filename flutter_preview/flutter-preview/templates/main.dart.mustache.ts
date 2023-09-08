export default `
{{#imports}}
import '{{{.}}}';
{{/imports}}

// init dependencies
import 'package:banban/bbbase/bbbase_init.dart';
import 'package:banban/init.dart';
import 'package:bbcore/bbcore.dart';

void main() async {
  await init();
  runApp(const FlutterPreview());
}

void init() async {
  await Constant.init();
  // Xhr.init();
  // AppConfig.syncDomains();
  initComponents();
  await Translations.initMain();
  initCurrentTheme();
  BBBaseInit.inilize();
}

class FlutterPreview extends StatelessWidget {
  const FlutterPreview();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: "{{title}}",
      theme: ThemeData(),
      home: Scaffold(
          body: Center(
        child: {{widget}}({{param}}),
      )),
    );
  }
}
`;
