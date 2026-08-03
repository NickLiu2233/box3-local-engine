import { spawn } from 'child_process';

const getCmd = (tsconfig: string, fixTarget: string) => {
  return `tsc -p ${tsconfig} --declaration --emitDeclarationOnly && node scripts/fix-declaration.js '${fixTarget}'`;
};

const go = () => {
  // server apis
  spawn(getCmd('api-tsconfig.json', './scripts/assets/api/**/*.d.ts'), [], {
    shell: true,
    stdio: 'inherit',
  });
  // client apis
  spawn(
    getCmd('client-api-tsconfig.json', './scripts/assets/client_api/**/*.d.ts'),
    [],
    {
      shell: true,
      stdio: 'inherit',
    },
  );
};

go();
