### **Phase 1: Core (MVP)**

1. **Quick Add & Task Entry:** A persistent input field to quickly type and save tasks. Add new todos. Mark as complete (and undo). Delete a todo. Be able to recorder list items.
2. **Task States:** Ability to mark tasks as complete (visual strike-through) or delete them entirely.
3. **Local Persistence:** Use `localStorage` to ensure data isn't lost upon refreshing the browser (since no backend is used).
4. **Sound Effects:** A satisfying "paper crinkle" sound when completing a task. "Pin" sound affect when listing a task. 

### **Phase 2: Nice to Have**

1. **Categorization via "Washi Tags":** Assign tasks to categories (Work, Personal, Self-care) represented by different colored washi tape strips.
2. **Priority Levels:** A simple "Star" or "High Priority" marker that changes the post-it color to a more vibrant hue.
3. **Drag-and-Drop:** Ability to reorder post-it notes on the digital "corkboard" background.

### **Phase 3: Future Enhancements**

1. **Natural Language Processing (NLP):** Type "Buy milk tomorrow at 5pm" to automatically set a due date.
2. **Sub-tasks:** The ability to nest smaller "mini-stickies" inside a main task.
3. **Dark Mode "Night Journal":** A low-light version of the UI for late-night planning.  A "Night Desk" aesthetic with darker paper tones.

## **Some other ideas**

- **The "Washi" Effect:** Use `mask-image` or a jagged `clip-path` in CSS to create the torn-edge look of tape on the top of each task.
- **Organic Movement:** Add a subtle `transform: rotate(-1deg);` to every second task. In a physical notebook, stickies are never perfectly straight.
- **Micro-interactions:** When a task is checked off, use a "crinkle" animation or a simple opacity fade to simulate the task being completed in a journal.





- **Cloud Sync:** Transition from Vanilla JS to a lightweight backend (like Supabase or Firebase) for multi-device sync.

