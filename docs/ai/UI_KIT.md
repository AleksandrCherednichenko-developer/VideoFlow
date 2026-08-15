# UI Kit

VideoFlow использует небольшой локальный UI kit на Tailwind CSS. Storybook и
внешняя component library отсутствуют.

## Existing primitives

| Primitive | Location | Use |
|---|---|---|
| Button | `frontend/src/components/ui/button.tsx` | actions, links through `asChild`, variants and sizes |
| Input | `frontend/src/components/ui/input.tsx` | text, date, time and file fields |
| Textarea | `frontend/src/components/ui/textarea.tsx` | descriptions and long text |
| AppLayout | `frontend/src/components/layout/AppLayout.tsx` | desktop sidebar and iOS-safe mobile navigation |
| PageHeader | `frontend/src/components/layout/PageHeader.tsx` | route title and description |
| StatGrid | `frontend/src/components/layout/StatGrid.tsx` | dashboard counters |

Перед созданием нового primitive проверь эти компоненты и `frontend/src/lib/utils.ts`.

## Design tokens

Цвета определены CSS variables в `frontend/src/index.css` и подключены через
`frontend/tailwind.config.ts`:

- `background` / `foreground`;
- `primary` / `primary-foreground`;
- `muted` / `muted-foreground`;
- `accent` / `accent-foreground`;
- `destructive` / `destructive-foreground`;
- `border`, `input`, `ring`;
- radius через `--radius`.

Dark theme следует `prefers-color-scheme`; отдельный theme switcher пока не
реализован.

## Rules

- Использовать semantic tokens, а не произвольные hex-цвета, кроме утверждённой
  платформенной маркировки календаря.
- Использовать `Button`, `Input` и `Textarea` вместо локально стилизованных
  аналогов.
- Создавать новый primitive только когда элемент повторяется или требует общего
  accessibility contract.
- Иконки брать из Lucide React; декоративные иконки получают `aria-hidden`.
- Интерактивные элементы должны иметь видимый focus state, disabled state и
  доступное имя.
- Учитывать `safe-area-inset-bottom`, touch target и узкую ширину iPhone.
- Не менять глобальные tokens внутри продуктовой задачи без UI/UX scope.
- Текущие английские тексты не являются образцом; новый пользовательский текст
  должен быть готов к русской локализации.

## Forms and states

Каждая форма должна явно отображать loading, validation, network error и success
state. Ошибки внешнего API нормализуются через существующий `getApiErrorMessage`.
Не полагаться только на цвет; status должен иметь текст.

## Reuse decision

Если существующий primitive почти подходит, сначала расширить его типизированным
variant/prop и добавить тестируемое поведение. Не создавать копию компонента на
уровне page ради отличающегося Tailwind class.
