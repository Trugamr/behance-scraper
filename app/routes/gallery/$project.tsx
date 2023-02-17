import type { LoaderArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { chromium } from 'playwright'
import invariant from 'tiny-invariant'
import fs from 'node:fs/promises'
import path from 'node:path'
import filenamify from 'filenamify'

export async function loader({ params }: LoaderArgs) {
  invariant(params.project, 'Project is not present')

  const url = new URL(`https://behance.net/gallery/${params.project}/_`)

  const browser = await chromium.launch({
    headless: false,
  })

  try {
    const page = await browser.newPage()
    await page.goto(url.href, {
      waitUntil: 'networkidle',
    })

    const title = await page.$eval('[class^="Project-title-"]', title => {
      return title.textContent
    })
    invariant(title, 'Project title invalid')

    const owner = await page.$eval('[class^="Project-ownerName-"]', owner => {
      return owner.textContent
    })
    invariant(owner, 'Project owner details not found')

    // TODO: Capture video files
    const images = await page.$$eval('#project-modules img', images => {
      return images.map(image => {
        if (image instanceof HTMLImageElement) {
          return image.src
        }
        throw new Error('Element is not a valid image element')
      })
    })

    for (const image of images) {
      const response = await fetch(image)
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const url = new URL(image)

      let filename = url.pathname.split('/').pop()
      if (filename) {
        filename = filenamify(filename)
      }
      if (!filename) {
        throw new Error('File name not found in image pathname')
      }

      const extension = path.extname(filename)
      if (!extension) {
        throw new Error('Failed to get image extension')
      }

      const directory = path.resolve(
        'downloads',
        filenamify(owner),
        filenamify(title),
      )
      try {
        await fs.stat(directory)
      } catch (error) {
        await fs.mkdir(directory, { recursive: true })
      }

      await fs.writeFile(path.join(directory, filename), buffer)
    }

    const project = {
      id: params.project,
      title,
      owner,
      images,
    }

    return json(project)
  } catch (error) {
    return json({ error }, { status: 500 })
  } finally {
    await browser.close()
  }
}
