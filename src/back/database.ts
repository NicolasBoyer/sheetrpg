import { Collection, MongoClient, ObjectId } from 'mongodb'
import { Utils } from './utils.js'
import { TSheet } from '../front/javascript/types.js'

let client: MongoClient

/**
 * Permet la déclaration de la db (ici un fichier json) et de résoudre les requêtes passées dans la fonction request
 */
export default class Database {
    static sheets: Collection

    static async auth(credentials: string): Promise<boolean> {
        try {
            const splitCredentials = credentials.split(':')
            client = client || (await MongoClient.connect(`mongodb+srv://${splitCredentials[0]}:${encodeURIComponent(splitCredentials[1])}@cluster0.camsv.mongodb.net?retryWrites=true&w=majority`))
            return true
        } catch (e) {
            return false
        }
    }

    static init(): void {
        const db = client?.db('sheetrpg')
        this.sheets = db.collection('nicolasboyer')
        // this.recipes = db.collection('recipes')
        // this.lists = db.collection('lists')
        // this.categories = db.collection('categories')
        // this.dishes = db.collection('dishes')
    }

    /**
     * Retourne ou enregistre des informations dans la db (des fichiers json) en fonction des requêtes reçues dans le resolver
     * Exemple : { "getRecipes": {"map": "title"} } reçu dans request et traité par la fonction get et résolu par la constante resolvers.
     * Retourne ce qui est traité dans la fonction getRecipes : les titres des recettes dans un array
     * À chaque requête doit correspondre une fonction. La key étant la fonction, la value les arguments
     * Autres exemples :
     * { "getRecipes": {"slug": "Tartiflette"} } retourne la recette tartiflette avec ses ingrédients via un objet
     * { "setRecipe": {"slug": "Tagliatelle à la carbonara"} } enregistre {"slug": "Tagliatelle à la carbonara"} dans la db recipes.json
     * @param datas requête à traiter par la fonction
     * @returns {*|[]|*[]} retourne un array si request est un array sinon un objet
     */
    static async request(datas: Record<string, string>[] | Record<string, string>): Promise<TSheet | TSheet[] | { error: string }> {
        const resolvers = {
            async getSheets(args?: Record<string, string>): Promise<TSheet | TSheet[]> {
                let sheets = []
                if (args?.slug) sheets.push(await Database.sheets.findOne({ slug: args.slug }))
                else if (args?.id) sheets.push(await Database.sheets.findOne({ _id: new ObjectId(args.id) }))
                else sheets = await Database.sheets.find().toArray()
                return sheets.length === 1 ? (sheets[0] as unknown as TSheet) : (sheets as unknown as TSheet[])
            },

            async setSheet(args: Record<string, string>): Promise<TSheet | TSheet[]> {
                const name = args.name
                const update = args
                if (!args.id) update.slug = Utils.slugify(name)
                await Database.sheets.updateOne({ _id: new ObjectId(args.id) }, { $set: update }, { upsert: true })
                return await resolvers.getSheets()
            },

            async removeSheet(args: Record<string, string>): Promise<TSheet | TSheet[]> {
                await Database.sheets.deleteOne({ _id: new ObjectId(args.id) })
                return await resolvers.getSheets()
            },

            async setNotepad(args: Record<string, string>): Promise<TSheet | TSheet[]> {
                await Database.sheets.updateOne({ _id: new ObjectId(args.id) }, { $set: { notepad: args.notepad } }, { upsert: true })
                return await resolvers.getSheets()
            },

            async setBackgroundColor(args: Record<string, string>): Promise<TSheet | TSheet[]> {
                await Database.sheets.updateOne({ _id: new ObjectId(args.id) }, { $set: { backgroundColor: args.color } }, { upsert: true })
                return await resolvers.getSheets()
            },

            async setBackgroundImage(args: Record<string, string>): Promise<TSheet | TSheet[]> {
                await Database.sheets.updateOne({ _id: new ObjectId(args.id) }, { $set: { backgroundImage: args.image } }, { upsert: true })
                return await resolvers.getSheets()
            },

            async setFont(args: Record<string, string>): Promise<TSheet | TSheet[]> {
                // @ts-expect-error : erreur provoquée via la mise à jour de Mongo DB en 6.4.0. Donc probablement une erreur de type par Mongo DB (TODO : revérifier lors de futures mises à jour)
                await Database.sheets.updateOne({ _id: new ObjectId(args.id) }, { $push: { fonts: { fontFamily: args.fontFamily, fontUrl: args.fontUrl } } })
                return await resolvers.getSheets()
            },

            async setUIBlocksPosition(args: Record<string, string>): Promise<TSheet | TSheet[]> {
                const isUIBlocksExists = ((await resolvers.getSheets({ id: args.id })) as TSheet).ui
                const blockType = Object.keys(args)[0]
                const update = !isUIBlocksExists ? { $set: { ui: args } } : blockType === 'editBlock' ? { $set: { 'ui.editBlock': args[blockType] } } : { $set: { 'ui.selectBlock': args[blockType] } }
                await Database.sheets.updateOne({ _id: new ObjectId(args.id) }, update, { upsert: true })
                return await resolvers.getSheets()
            },

            async setUIBlocksInterface(args: Record<string, string>): Promise<TSheet | TSheet[]> {
                const isUIBlocksExists = ((await resolvers.getSheets({ id: args.id })) as TSheet).ui
                const update = !isUIBlocksExists ? { $set: { ui: args } } : { $set: { 'ui.interface': args.interface } }
                await Database.sheets.updateOne({ _id: new ObjectId(args.id) }, update, { upsert: true })
                return await resolvers.getSheets()
            },

            async deleteFont(args: Record<string, string>): Promise<TSheet | TSheet[]> {
                // @ts-expect-error : erreur provoquée via la mise à jour de Mongo DB en 6.4.0. Donc probablement une erreur de type par Mongo DB (TODO : revérifier lors de futures mises à jour)
                await Database.sheets.updateOne({ _id: new ObjectId(args.id) }, { $pull: { fonts: { fontFamily: { $in: args.fonts } } } })
                return await resolvers.getSheets()
            },

            async setInput(args: Record<string, string>): Promise<TSheet | TSheet[]> {
                const isInputExists = ((await resolvers.getSheets({ id: args.id })) as TSheet).inputs?.some((pInput): boolean => pInput.id === args.inputId)
                const update = isInputExists ? { $set: { 'inputs.$': args.input } } : { $push: { inputs: args.input } }
                const filter = isInputExists ? { _id: new ObjectId(args.id), 'inputs.id': args.inputId } : { _id: new ObjectId(args.id) }
                // @ts-expect-error : erreur provoquée via la mise à jour de Mongo DB en 6.4.0. Donc probablement une erreur de type par Mongo DB (TODO : revérifier lors de futures mises à jour)
                await Database.sheets.updateOne(filter, update)
                return await resolvers.getSheets()
            },

            async deleteInput(args: Record<string, string>): Promise<TSheet | TSheet[]> {
                // @ts-expect-error : erreur provoquée via la mise à jour de Mongo DB en 6.4.0. Donc probablement une erreur de type par Mongo DB (TODO : revérifier lors de futures mises à jour)
                await Database.sheets.updateOne({ _id: new ObjectId(args.id) }, { $pull: { inputs: { id: args.inputId } } })
                return await resolvers.getSheets()
            },

            async setImage(args: Record<string, string>): Promise<TSheet | TSheet[]> {
                const isImageExists = ((await resolvers.getSheets({ id: args.id })) as TSheet).images?.some((pImage): boolean => pImage.id === args.imageId)
                const update = isImageExists ? { $set: { 'images.$': args.image } } : { $push: { images: args.image } }
                const filter = isImageExists ? { _id: new ObjectId(args.id), 'images.id': args.imageId } : { _id: new ObjectId(args.id) }
                // @ts-expect-error : erreur provoquée via la mise à jour de Mongo DB en 6.4.0. Donc probablement une erreur de type par Mongo DB (TODO : revérifier lors de futures mises à jour)
                await Database.sheets.updateOne(filter, update)
                return await resolvers.getSheets()
            },

            async deleteImage(args: Record<string, string>): Promise<TSheet | TSheet[]> {
                // @ts-expect-error : erreur provoquée via la mise à jour de Mongo DB en 6.4.0. Donc probablement une erreur de type par Mongo DB (TODO : revérifier lors de futures mises à jour)
                await Database.sheets.updateOne({ _id: new ObjectId(args.id) }, { $pull: { images: { id: args.imageId } } })
                return await resolvers.getSheets()
            },
            // async getRecipes (args) {
            //	let recipes = []
            //	if (args?.slug) recipes.push(await Database.recipes.findOne({ slug: args.slug }))
            //	else recipes = await Database.recipes.find().toArray()
            //	if (args?.map) recipes = recipes.map((ingredient) => ingredient[args.map])
            //	else {
            //		for (const recipe of recipes) {
            //			recipe.ingredients = (await Database.ingredients.find({ recipes: { $elemMatch: { recipeId: recipe._id.toString() } } }).toArray()).map((ingredient) => {
            //				const recipe = ingredient.recipes.find((pRecipe) => typeof pRecipe === 'object')
            //				return recipe ? { title: ingredient.title, size: recipe.size, unit: recipe.unit } : ingredient.title
            //			})
            //		}
            //	}
            //	return recipes.length === 1 ? recipes[0] : recipes
            // },
            //
            // async setRecipe (args) {
            //	const title = args.title
            //	const updateResult = await Database.recipes.updateOne({ _id: new ObjectId(args.id) }, { $set: { title, slug: Utils.slugify(title) } }, { upsert: true })
            //	args.recipeId = args.id || updateResult.upsertedId.toString()
            //	const ingredients = await resolvers.setIngredients(args)
            //	return [await resolvers.getRecipes(), ingredients]
            // },
            //
            // async removeRecipe (id) {
            //	await Database.recipes.deleteOne({ _id: new ObjectId(id) })
            //	await Database.ingredients.updateMany({}, { $pull: { recipes: { recipeId: id } } })
            //	return await resolvers.getRecipes()
            // },
            //
            // async getIngredients (args) {
            //	let ingredients = await Database.ingredients.find().toArray()
            //	if (args?.map) ingredients = ingredients.map((ingredient) => ingredient[args.map])
            //	return ingredients
            // },
            //
            // async setIngredients (args) {
            //	const newIngredients = []
            //	for (const ingredient of args.ingredients) {
            //		let currentIngredient
            //		const objectId = new ObjectId(ingredient.id)
            //		ingredient.filter = ingredient.id ? { _id: objectId } : { title: ingredient.title }
            //		currentIngredient = ingredient.id ? await Database.ingredients.findOne({ _id: objectId }) : await Database.ingredients.findOne({ title: ingredient.title })
            //		if (!currentIngredient) currentIngredient = {}
            //		currentIngredient.title = ingredient.title
            //		currentIngredient.category = ingredient.category || currentIngredient.category || ''
            //		if (!currentIngredient.recipes) currentIngredient.recipes = []
            //		if (args.ingredients.some((pIngredient) => pIngredient._id === ingredient.id) && args.recipeId) {
            //			if (!currentIngredient.recipes.some((pRecipe) => pRecipe.recipeId === args.recipeId)) {
            //				// Ajout de recette dans ingredient
            //				currentIngredient.recipes.push({
            //					recipeId: args.recipeId,
            //					size: ingredient.size,
            //					unit: ingredient.unit
            //				})
            //			} else {
            //				// Edit recette dans ingredient
            //				const recipe = currentIngredient.recipes.find((pRecipe) => pRecipe.recipeId === args.recipeId)
            //				recipe.size = ingredient.size
            //				recipe.unit = ingredient.unit
            //			}
            //		}
            //		newIngredients.push(currentIngredient)
            //	}
            //	let ingredients = []
            //	if (args.recipeId) {
            //		ingredients = (await Database.ingredients.find({ recipes: { $elemMatch: { recipeId: args.recipeId.toString() } } }).toArray()).filter((pIngredient) => !args.ingredients.some((pArgIngredient) => pArgIngredient.title === pIngredient.title)).map((pIngredient) => pIngredient.recipes.splice(pIngredient.recipes.indexOf(args.recipeId), 1) && pIngredient)
            //	}
            //	await Database.ingredients.bulkWrite([...newIngredients, ...ingredients].map((ingredient, index) =>
            //		({
            //			updateOne: {
            //				filter: args.ingredients[index]?.filter || { _id: new ObjectId(ingredient._id) },
            //				update: { $set: ingredient },
            //				upsert: true
            //			}
            //		})
            //	))
            //	return await resolvers.getIngredients()
            // },
            //
            // async removeIngredient (id) {
            //	await Database.ingredients.deleteOne({ _id: new ObjectId(id) })
            //	return await resolvers.getIngredients()
            // },
            //
            // async getListIngredients () {
            //	return await Database.lists.find().toArray()
            // },
            //
            // async setListIngredients (args) {
            //	const newIngredients = []
            //	let isEdit = false
            //	let isNewCategory = false
            //	for (const ingredient of args.ingredients) {
            //		const { id, ...currentIngredient } = ingredient
            //		if (ingredient.title) currentIngredient.title = ingredient.title
            //		ingredient.filter = ingredient.id ? { _id: new ObjectId(ingredient.id) } : { title: ingredient.title, unit: ingredient.unit }
            //		if (!ingredient.id) {
            //			const listIngredient = await Database.lists.findOne(ingredient.filter)
            //			currentIngredient.size = listIngredient?.unit === ingredient.unit ? Number(listIngredient?.size) + Number(ingredient.size) : ingredient.size
            //			currentIngredient.unit = listIngredient?.unit || ingredient.unit
            //			currentIngredient.category = listIngredient?.category || ingredient.category || ''
            //		}
            //		isNewCategory = !!ingredient.category
            //		isEdit = !!ingredient.id
            //		newIngredients.push(currentIngredient)
            //	}
            //	await Database.lists.bulkWrite(newIngredients.map((ingredient, index) =>
            //		({
            //			updateOne: {
            //				filter: args.ingredients[index].filter,
            //				update: { $set: ingredient },
            //				upsert: true
            //			}
            //		})
            //	))
            //	if (!isEdit) await resolvers.setIngredients(args)
            //	if (isNewCategory && args.ingredients.length === 1) {
            //		delete args.ingredients[0].id
            //		await resolvers.setIngredients(args)
            //	}
            //	return resolvers.getListIngredients()
            // },
            //
            // async removeListIngredient (id) {
            //	await Database.lists.deleteOne({ _id: new ObjectId(id) })
            //	return await resolvers.getListIngredients()
            // },
            //
            // async clearListIngredients () {
            //	await Database.lists.deleteMany({})
            //	return resolvers.getListIngredients()
            // },
            //
            // async getCategories () {
            //	return await Database.categories.find().toArray()
            // },
            //
            // async setCategory (args) {
            //	await Database.categories.updateOne({ _id: new ObjectId(args.id) }, { $set: { title: args.title } }, { upsert: true })
            //	return await resolvers.getCategories()
            // },
            //
            // async removeCategory (id) {
            //	await Database.categories.deleteOne({ _id: new ObjectId(id) })
            //	await Database.ingredients.updateMany({ category: id }, { $unset: { category: '' } })
            //	await Database.lists.updateMany({ category: id }, { $unset: { category: '' } })
            //	return await resolvers.getCategories()
            // },
            //
            // async getDishes () {
            //	return await Database.dishes.find().toArray()
            // },
            //
            // async setDish (args) {
            //	await Database.dishes.updateOne({ _id: new ObjectId(args._id) }, { $set: { day: args.day, time: args.time, name: args.name } }, { upsert: true })
            //	return await resolvers.getDishes()
            // },
            //
            // async clearDishes (id) {
            //	if (id) await Database.dishes.deleteOne({ _id: new ObjectId(id) })
            //	else await Database.dishes.deleteMany({})
            //	return resolvers.getDishes()
            // }
        }
        const resArr: TSheet[] = []
        let resolver: (args: string) => Promise<TSheet | TSheet[]>
        if (Array.isArray(datas)) {
            for (const data of datas) {
                const func = Object.keys(data)[0]
                resolver = resolvers[func as keyof typeof resolver]
                if (!resolver) return { error: `no resolver function for ${func}` }
                resArr.push(<TSheet>await resolver(Object.values(data)[0]))
            }
            return resArr
        }
        const func = Object.keys(datas)[0]
        resolver = resolvers[func as keyof typeof resolver]
        if (!resolver) return { error: `no resolver function for ${func}` }
        return await resolver(Object.values(datas)[0])
    }
}
