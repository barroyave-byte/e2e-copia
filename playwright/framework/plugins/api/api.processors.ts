import { Context, FrameworkPlugin } from '../interface';
export class PluginApiProcessors extends FrameworkPlugin {
  pluginBaseName = 'api.processors';

  setTestContext(context: Context) {
    super.setTestContext(context);
  }
}
