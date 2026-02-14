import dccworldDataModel from "./base-model.mjs";

export default class dccworldItemBase extends dccworldDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    schema.description = new fields.StringField({ required: true, blank: true });

    // Skills granted by this item
    // Each entry contains: {skillUuid: string, level: number}
    schema.grantedSkills = new fields.ArrayField(
      new fields.ObjectField({
        required: true,
        nullable: false,
        initial: {}
      }),
      {
        required: true,
        initial: []
      }
    );

    return schema;
  }

}