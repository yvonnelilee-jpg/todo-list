### **Phase 1: Core (MVP)**

1. **Quick Add & Task Entry:** A persistent input field to quickly type and save tasks. Add new todos. Mark as complete (and undo). Delete a todo. Be able to recorder list items.
2. **Task States:** Ability to mark tasks as complete (visual strike-through) or delete them entirely.
3. **Cloud Persistence:** Use Supabase for durable multi-session data storage (tabs, todos, subtasks, ordering).
4. **Sound Effects:** A satisfying "paper crinkle" sound when completing a task. "Pin" sound affect when listing a task.
5. **Dark Mode "Night Journal":** A low-light version of the UI for late-night planning.  A "Night Desk" aesthetic with darker paper tones.

### **Phase 2: Enhancements**

1. Ability to create/delete folder tabs in-app. Default seeded tabs are Work, Personal, Groceries. Each tab has a unique face color.
2. **Sub-tasks:** The ability to nest smaller "mini-stickies" inside a main task.

### **Phase 3: Nice to Have**

1. Abilty to add quotes.
2. **Priority Levels:** A simple "Star" or "High Priority" marker that changes the post-it color to a more vibrant hue.
3. **Natural Language Processing (NLP):** users can click on the a microphone icon to activiate voice control to listen and add a task by speech

## **Some other ideas**

- **The "Washi" Effect:** Use `mask-image` or a jagged `clip-path` in CSS to create the torn-edge look of tape on the top of each task.
- Corkboard" background.
- **Organic Movement:** Add a subtle `transform: rotate(-1deg);` to every second task. In a physical notebook, stickies are never perfectly straight.
- **Micro-interactions:** When a task is checked off, use a "crinkle" animation or a simple opacity fade to simulate the task being completed in a journal.
- **Cloud Sync:** Supabase-backed persistence is active; extend to auth-scoped private notebooks in future phases.

