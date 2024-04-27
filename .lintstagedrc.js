export default {
  '*.ts': () => 'npm run type-check',
  '*.{js,ts}': ['eslint --fix', 'npm run test:related'],
  '*': 'prettier --ignore-unknown --write',
};
