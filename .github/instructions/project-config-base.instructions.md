---
applyTo: '**'
---
- use sempre pnpm pra gerenciar este projeto
- pra toda modficiação que fiz neste projeto, use sempre absolute paths, com alias path "@", barrel files, kebak-case
- lembre-se de fazer sempre estritamente o que eu pedi, jamais tente avançar etapas, porque isso atrapalha o desenvolvimento, você não sabe quais serão meus próximos passos, implementar ou mudar coisas as quais não solicitei atrasará o processo.
- não crie arquivos md (markdown) exceto se solicitado
- no package "shared-types", teremos os tipos que são usados apenas por apps, os outros packages armazenam seus próprios types, mas shared types pode extender os tipos de outros packages, mas não deve ser o contrário. Além disso, a cada novo app ou package criado, vamos garantir que as builds sigam um lógica de dependências, assim evitamos dependências circulares, todos os packages devem usar husky.