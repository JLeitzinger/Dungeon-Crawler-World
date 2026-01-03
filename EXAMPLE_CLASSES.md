# Example Classes with Starting Skills

This document provides example class configurations for the Dungeon Crawler World system. Use these as templates when creating classes in Foundry VTT.

## How to Create Classes

1. In Foundry VTT, create a new Item of type "Class"
2. Fill in the basic attributes (Hit Die, HP, Stamina, Mana per level, etc.)
3. To add starting skills, you'll need to edit the item's data directly:
   - Right-click the class item → Edit (Advanced)
   - Or use a macro to set the `system.startingSkills` field

## Warrior Class

**Concept:** Melee combatant focused on physical prowess

**Stats:**
- Hit Die: d10
- Primary Ability: STR
- Secondary Ability: CON
- Base HP: 12
- HP per Level: 6
- Stamina per Level: 3
- Mana per Level: 0

**Starting Skills:**
```json
{
  "combat": {
    "id": "combat",
    "name": "Combat",
    "level": 2,
    "parent": "do-something",
    "category": "combat",
    "relatedStat": "str"
  },
  "melee": {
    "id": "melee",
    "name": "Melee",
    "level": 2,
    "parent": "combat",
    "category": "combat",
    "relatedStat": "str"
  }
}
```

## Mage Class

**Concept:** Spellcaster focused on arcane magic

**Stats:**
- Hit Die: d6
- Primary Ability: INT
- Secondary Ability: WIS
- Base HP: 6
- HP per Level: 3
- Stamina per Level: 1
- Mana per Level: 5

**Starting Skills:**
```json
{
  "magic": {
    "id": "magic",
    "name": "Magic",
    "level": 2,
    "parent": "do-something",
    "category": "magic",
    "relatedStat": "int"
  },
  "arcane": {
    "id": "arcane",
    "name": "Arcane",
    "level": 2,
    "parent": "magic",
    "category": "magic",
    "relatedStat": "int"
  }
}
```

## Rogue Class

**Concept:** Agile specialist in stealth and precision

**Stats:**
- Hit Die: d8
- Primary Ability: DEX
- Secondary Ability: CHA
- Base HP: 8
- HP per Level: 4
- Stamina per Level: 3
- Mana per Level: 1

**Starting Skills:**
```json
{
  "combat": {
    "id": "combat",
    "name": "Combat",
    "level": 1,
    "parent": "do-something",
    "category": "combat",
    "relatedStat": "dex"
  },
  "stealth": {
    "id": "stealth",
    "name": "Stealth",
    "level": 2,
    "parent": "do-something",
    "category": "utility",
    "relatedStat": "dex"
  },
  "ranged": {
    "id": "ranged",
    "name": "Ranged",
    "level": 2,
    "parent": "combat",
    "category": "combat",
    "relatedStat": "dex"
  }
}
```

## Cleric Class

**Concept:** Divine spellcaster and healer

**Stats:**
- Hit Die: d8
- Primary Ability: WIS
- Secondary Ability: CON
- Base HP: 10
- HP per Level: 5
- Stamina per Level: 2
- Mana per Level: 4

**Starting Skills:**
```json
{
  "magic": {
    "id": "magic",
    "name": "Magic",
    "level": 2,
    "parent": "do-something",
    "category": "magic",
    "relatedStat": "wis"
  },
  "divine": {
    "id": "divine",
    "name": "Divine",
    "level": 2,
    "parent": "magic",
    "category": "magic",
    "relatedStat": "wis"
  },
  "healing": {
    "id": "healing",
    "name": "Healing",
    "level": 1,
    "parent": "divine",
    "category": "magic",
    "relatedStat": "wis"
  }
}
```

## Setting Starting Skills via Macro

You can use this macro in Foundry to set starting skills on a class:

```javascript
// Select your class item first, then run this macro

const classItem = game.items.getName("Warrior"); // Change to your class name

if (!classItem) {
  ui.notifications.error("Class not found!");
} else {
  await classItem.update({
    "system.startingSkills": {
      "combat": {
        "id": "combat",
        "name": "Combat",
        "level": 2,
        "parent": "do-something",
        "category": "combat",
        "relatedStat": "str"
      },
      "melee": {
        "id": "melee",
        "name": "Melee",
        "level": 2,
        "parent": "combat",
        "category": "combat",
        "relatedStat": "str"
      }
    }
  });

  ui.notifications.info("Starting skills added to " + classItem.name);
}
```

## Skill Design Guidelines

When designing starting skills for classes:

1. **Start at Level 1-2**: Characters should start competent but not overpowered
2. **Match Class Theme**: Skills should reflect what the class is good at
3. **Use Hierarchies**: Create parent-child relationships (Combat → Melee → Sword Fighting)
4. **Relate to Stats**: Link skills to appropriate ability scores for synergy
5. **Balance**: Warriors get combat skills, mages get magic skills, rogues get utility

## Skill Categories

- **combat**: Physical fighting skills
- **magic**: Spellcasting and magical abilities
- **utility**: Non-combat skills (stealth, persuasion, crafting, etc.)
- **general**: Broadly applicable skills
