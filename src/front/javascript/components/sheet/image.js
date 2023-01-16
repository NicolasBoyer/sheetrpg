import { Utils } from '../../classes/utils.js'
import Datas from './datas.js'
import States from './states.js'
import Sheet from './sheet.js'
import { Drawer } from '../../classes/drawer.js'
import { html } from '../../thirdParty/litHtml.js'
import { ElementManager } from '../../classes/elementManager.js'

/**
 * Contient toutes les fonctions relatives aux possibilités de l'image
 */
export default class Image {
	// TODO zoom sur image pour voir en grand
	static add () {
		States.displayEditBlock(false)
		Drawer.init(Sheet.element.querySelector('.wrapper'), { x: Sheet.containerLeft, y: Sheet.containerTop }, async (pMousePosition, pEvent) => {
			States.displayEditBlock(true)
			const image = { id: Utils.generateId().toString() }
			let file
			Utils.confirm(html`
					<label for="file">
						<span>Choisissez un fichier</span>
						<input type="file" id="file" name="file" @change="${(pEvent) => {
				file = pEvent.target.files[0]
			}}">
					</label>
				`, () => {
				const reader = new FileReader()
				reader.addEventListener('load', () => {
					Datas.addImageValues(image, 'x', Math.round(pMousePosition.startX / Sheet.ratio), 'y', Math.round(pMousePosition.startY / Sheet.ratio), 'width', Math.round(pMousePosition.x / Sheet.ratio - pMousePosition.startX / Sheet.ratio), 'height', Math.round(pMousePosition.y / Sheet.ratio - pMousePosition.startY / Sheet.ratio), 'image', reader.result)
					ElementManager.select(pEvent, image)
					States.isSaved = false
				})
				reader.readAsDataURL(file)
			})
		})
	}
}