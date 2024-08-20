# deploys to github pages if you have the gh-pages branch

git checkout gh-pages
git merge --no-ff main
git push
git checkout main
