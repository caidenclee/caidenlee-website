# ZBLS trainer
## https://trexrush.github.io/zbls-trainer/
## created from the (old, non-Vue) codebase of https://bestsiteever.ru/zbll/

![zbll trainer demo](images/demo.gif)

For more details on how this trainer works, visit the ZBLL trainer repo.


Casemap
----------

The casemap was generated using batch solver, with a ESQ of 

```
__: -1
```

or

```
__: -5
_2: -3
```

to prioritize longer cases.

Images
---------

Images were generated using trainyu to get a list of ZBLS algs to feed into visualcube via a gsheets formulas and Excel Parser Processor to mass download/rename the files for them to work with the existing code of this trainer.


Future plans
----------

I am currently refactoring the entire application to be written with Typescript, with Astro and Svelte. I am also restructuring the project to be a general purpose trainer that will work for many algsets (like trainyu currently does)
