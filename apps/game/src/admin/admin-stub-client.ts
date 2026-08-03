import { MuClient } from '@box-local/mudb/client';
import { AdminProtocol } from '@box-local/schema/admin/admin-gateway-protocol';

export function installStubAdminClient(client: MuClient) {
  client.protocol(AdminProtocol).configure({
    message: {
      redirect: (href) => {
        window.location.href = href;
      },
      alert: (message) => {
        alert(message);
      },
    },
  });
}
