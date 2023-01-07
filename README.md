# AppRun Logseq Clone

## Why clone Logseq

The ideal note-taking workflow should allow us to write down notes quickly anywhere and anytime, and then use them efficiently in the future.

Logseq's journal feature lets us just start taking notes without worrying about the structure of the notes and in which folder or category or file to put them. Also, Logseq provides a clean and minimalistic UI for organizing knowledge in a tree structure. It is very helpful for quickly organizing the notes in a logical order. So, Step one of the workflow is almost done (cloud sync can still be improved in Logseq).

When it comes to using the notes, with today's apps, we have to manually link the notes together. It is a tedious and time-consuming task. We just got out of managing folders and files, and we are still in the hole of managing the links between the bullet points a.k.a. knowledge blocks. It is again a waste of time and energy (although, there is an auto-link plugin that can solve part of the problem)

However, a bigger problem is that in today's apps, links are wiki links. They tie blocks together but without any context. I think links should be context-based. In different circumstances (e.g. when I am writing on/researching certain topics), blocks should be linked in different ways. What I want is to give a few ideas or a few keywords and expect the app to build a relevant knowledge graph on the fly automatically. At the end of the day, my files are clean (with minimal links) and I can traverse through dynamically generated knowledge graphs. In other words, it's like using my notes to train an AI model. Therefore, I can make most of the notes I spent time writing down.

Context-based auto-linking can be the key competing feature of note-taking apps in the future. I want to see if I can make something like it is described above. Logseq is written in ClojureScript, which I am not familiar with. So, I decided to start with cloning some basic UI features of Logseq using AppRun, a JavaScript framework. And get familiar with the underline graph data model. And then, I will continue to research the context-based auto-linking feature and AI solutions.

## To Use

```bash
npm install
npm run watch
npm start
```


## License

[CC0 1.0 (Public Domain)](LICENSE.md)
