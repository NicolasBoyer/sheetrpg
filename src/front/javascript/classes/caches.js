import { deleteDB, openDB } from '../thirdParty/idb.js'

const indexedDBCaches = []

export class Caches {
	static async set (...args) {
		for (let i = 0; i < args.length; i++) {
			const maxStorageSize = 1024 * 1024 * 5 - JSON.stringify(sessionStorage).length
			const storage = JSON.stringify(args[i + 1])
			if (storage && storage.length >= maxStorageSize) {
				const db = await openDB(args[i], 1, { upgrade: (db) => db.createObjectStore(args[i]) })
				indexedDBCaches.push(args[i])
				const transaction = db.transaction(args[i], 'readwrite')
				const objectStore = transaction.objectStore(args[i])
				await objectStore.put(args[i + 1], args[i])
				db.close()
				return
			}
			if (i % 2 === 0) sessionStorage.setItem(args[i], storage)
		}
	}

	static async get (...args) {
		try {
			let datas = []
			for (const arg of args) {
				if (indexedDBCaches.includes(arg)) {
					const db = await openDB(arg, 1)
					datas.push(await db.transaction(arg).objectStore(arg).get(arg))
				} else datas.push(JSON.parse(sessionStorage.getItem(arg)))
			}
			datas = datas.filter((pEntry) => pEntry)
			return datas.length === 1 && datas.length === args.length ? datas[0] : datas.length && datas.length === args.length ? datas : null
		} catch (e) {
			alert(e)
		}
	}
}

// eslint-disable-next-line func-call-spacing
window.addEventListener('beforeunload', () => indexedDBCaches.forEach((dbName) => deleteDB(dbName)))
