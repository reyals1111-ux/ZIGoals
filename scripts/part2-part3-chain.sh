#!/bin/bash
SC=/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/897eacab-d419-4a8a-bc51-21efae38e430/scratchpad
"$SC/part3-measure.sh" sonnet opus || exit $?
"$SC/part2-corpus.sh" sonnet-all sonnet-important-x2 haiku-all-x3 opus-all
