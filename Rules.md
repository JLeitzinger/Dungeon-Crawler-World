1. Say what you do and roll a number of D6s, determined by the level of relevant skill you have.
2. If the sum of your roll is higher than an opposing roll, the thing you wanted to happen, happens.
3. At start, you have only one skill: _Do Something 1_.
4. If you roll all 6s, you get a new skill specific to the action, one level higher than the one you used.
5. For every roll you fail, you get 1 XP.
6. XP can be used to change a die into a 6 for advancement purposes only.


Every skill check in the game is a contested skill check. 

For every check,
- you choose what skill you'll use
- if it's a general skill check roll
	- the AI will choose what to contest it with and the appropriate number of dice (see [[Difficulty]] for how to size it)
- if it's a [[Attack]]
	- the enemy will roll a skill in response — if they're wearing armor, that's usually [[Armor|Defend]]

Every skill check you roll according to the [[Core Rules]] is able to lead to a skill improvement.

Skills are not invented during play — they come from your race, class, equipment, and feats (see [[Skill Acquisition]]). [[Do Something]] is the one skill every crawler starts with.

For skill rolls (excluding damage):
- If you roll the [[Do Something]] skill
	- rolling all 6s grants 2 bonus XP instead of a new skill.
- If you roll a skill other than that
	- rolling all 6s improves that skill by one level.

## Skill Levels
- Skills are acquired at whatever level your race/class/item/feat grants them (typically 1-3)
- You cannot level the [[Do Something]] skill
- For every level in a skill, you roll an additional d6 on checks using that skill

Combat occurs in rounds. At the start of each round, every combatant is dealt a card to determine turn order — see [[Initiative]] and [[Combat Tracker]].

Each round of combat will consist each player taking a turn. During their turn, a player may do one or more of the following actions:
- [[Move]]
- [[Attack]]
- [[Free Action]]

**Charisma (CHA):**

- **What it Represents:** Force of personality, charm, leadership, persuasiveness, and confidence. It's about a character's ability to influence and interact with others.
	
- **Common Applications:**
	
	- Persuading, negotiating, or charming NPCs.
		
	- Intimidating or deceiving others.
		
	- Performing for an audience.
		
	- Rallying allies or leading a group.
		
	- Casting spells that draw on force of will or social presence.
		
	- Maintaining a strong public image.
		
- **Associated Skills (Examples):** Deception, Intimidation, Performance, Persuasion.

**Constitution (CON):**

- **What it Represents:** Stamina, endurance, health, and resilience. It's about a character's physical hardiness and ability to withstand punishment, illness, or fatigue.
	
- **Common Applications:**
	
	- Determining Hit Points (Health).
		
	- Resisting poisons, diseases, and environmental hazards (cold, heat).
		
	- Enduring long journeys or strenuous activities.
		
	- Maintaining concentration when injured or fatigued.
		
	- Stabilizing when critically wounded.
		
- **Associated Skills (Examples):** Fortitude (often a saving throw), Survival (in harsh conditions).

1. **Dexterity (DEX):**
    
    - **What it Represents:** Agility, balance, reflexes, fine motor control, and coordination. It's about speed, precision, and grace.
        
    - **Common Applications:**
        
        - Ranged attacks (shooting bows, throwing knives, firing guns).
            
        - Dodging attacks or avoiding traps.
            
        - Stealth and sneaking.
            
        - Picking locks, disarming traps, sleight of hand.
            
        - Maintaining balance on narrow surfaces.
            
    - **Associated Skills (Examples):** Acrobatics, Stealth, Sleight of Hand, Thievery.
        

**Intelligence (INT):**

- **What it Represents:** Mental acuity, logical reasoning, memory, analysis, and the capacity for learning. It's about knowledge and the ability to process information.
	
- **Common Applications:**
	
	- Recalling lore, history, or specific facts.
		
	- Solving puzzles or deciphering codes.
		
	- Investigating crime scenes or examining evidence.
		
	- Understanding magical theory or ancient languages.
		
	- Creating complex plans or inventions.
		
- **Associated Skills (Examples):** Arcana, History, Investigation, Nature, Medicine (theoretical knowledge)

**Luck (LUK):**

Luck doesn't work like the other six ability scores. It has no rolled starting value, no `floor((score - 10) / 2)` modifier formula, and it's not something you can spend a leveling stat increase on.

Every crawler starts with LUK 0. From there, it only moves through race, class, items, and equipment — never through play, never through leveling. Whatever your current LUK total is, that number is added directly to every roll you make: skill checks, attacks, defense rolls, resource regen, Dying stabilization checks — all of it, no exceptions, no conversion formula. LUK 0 changes nothing. LUK +2 means +2 on the total, every time.

Most sources should move LUK by 1 or 2 — a small, mostly-invisible nudge. Save bigger swings (+3 or more, either direction) for genuinely rare, mythic-tier items or curses — since LUK touches every roll a character makes, a point of LUK is worth more than a point in any other stat. Negative LUK from a cursed item is fair game.

**Strength (STR):**

- **What it Represents:** Raw physical power, muscle, and brawn. It's about how much force a character can exert.

- **Common Applications:**
	- Melee attacks (hitting things with swords, axes, fists).
	- Lifting, carrying, pushing, pulling heavy objects.
	- Breaking down doors or walls.
	- Jumping, climbing (especially if it requires brute force).
	- Resisting effects that would physically restrain or move you.

**Wisdom (WIS):**

- **What it Represents:** Perception, intuition, common sense, willpower, and an understanding of the world's nuances. It's about awareness, insight, and the ability to act on good judgment.
	
- **Common Applications:**
	
	- Noticing hidden details or ambushes.
		
	- Sensing deceit or intentions.
		
	- Resisting mental attacks or illusions.
		
	- Navigating wilderness or understanding animal behavior.
		
	- Healing others (practical application).
		
	- Making sound decisions under pressure.
		
- **Associated Skills (Examples):** Insight, Perception, Survival (practical application), Medicine (practical healing), Animal Handling.




A character's total Magic Points (MP) is a function of their [[WIS]] and [[INT]].
Every round, a character can roll 1d6 + their [[INT]] modifier (minimum 0) to regain missing MP (see [[Ability Modifiers]]).
Out of combat, the AI will tell the party when a round has passed.



A character's total Health Points (HP) is a function of their [[CON]] and [[STR]].
Every round, a character can roll 1d6 + their [[CON]] modifier (minimum 0) to regain missing HP (see [[Ability Modifiers]]).
Out of combat, the AI will tell the party when a round has passed.



A character's total Stamina is a function of their [[STR]] and [[DEX]].
Every round, a character can roll 1d6 + their [[STR]] modifier (minimum 0) to regain missing Stamina (see [[Ability Modifiers]]).
Out of combat, the AI will tell the party when a round has passed.

Some skills spend Stamina to use — see [[Effort]].