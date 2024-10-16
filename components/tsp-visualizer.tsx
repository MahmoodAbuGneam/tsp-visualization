"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Linkedin } from "lucide-react"

interface Point {
  x: number;
  y: number;
}

interface Metrics {
  possiblePaths: number;
  elapsedTime: number;
  currentDistance: number;
  minDistance: number;
}

// Utility functions
const distance = (a: Point, b: Point): number => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
const pathCost = (path: Point[]): number => {
  let cost = 0
  for (let i = 0; i < path.length - 1; i++) {
    cost += distance(path[i], path[i + 1])
  }
  return cost
}

const formatLargeNumber = (num: number): string => {
  if (num > 1e6) {
    return num.toExponential(2)
  }
  return num.toLocaleString()
}

export function TspVisualizer() {
  const [vertices, setVertices] = useState(20)
  const [speed, setSpeed] = useState(50)
  const [algorithm, setAlgorithm] = useState("nearest-neighbor")
  const [isRunning, setIsRunning] = useState(false)
  const [points, setPoints] = useState<Point[]>([])
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [bestPath, setBestPath] = useState<Point[]>([])
  const [metrics, setMetrics] = useState<Metrics>({
    possiblePaths: 0,
    elapsedTime: 0,
    currentDistance: 0,
    minDistance: Infinity,
  })
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const algorithmRef = useRef<{ stopped: boolean } | null>(null)

  const factorial = useMemo(() => {
    return (n: number): number => {
      if (n === 0 || n === 1) return 1
      return n * factorial(n - 1)
    }
  }, [])

  const randomizeVerticesCallback = useCallback(() => {
    const gridSizeX = 20 // 40 columns
    const gridSizeY = 15 // 40 rows
    const newPoints: Point[] = []
    const usedPositions = new Set<string>()

    while (newPoints.length < vertices) {
      const x = Math.floor(Math.random() * 38 + 1) * gridSizeX // 1 to 38 (leaving 1 unit margin on each side)
      const y = Math.floor(Math.random() * 38 + 1) * gridSizeY // 1 to 38 (leaving 1 unit margin on each side)
      const posKey = `${x},${y}`

      if (!usedPositions.has(posKey)) {
        newPoints.push({ x, y })
        usedPositions.add(posKey)
      }
    }

    setPoints(newPoints)
    setCurrentPath([])
    setBestPath([])
    setMetrics({
      possiblePaths: factorial(vertices),
      elapsedTime: 0,
      currentDistance: 0,
      minDistance: Infinity,
    })
  }, [vertices, factorial])

  const drawCanvasCallback = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 1
    for (let i = 0; i <= 40; i++) {
      ctx.beginPath()
      ctx.moveTo(i * 20, 0)
      ctx.lineTo(i * 20, 600)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * 15)
      ctx.lineTo(800, i * 15)
      ctx.stroke()
    }

    // Draw points
    ctx.fillStyle = "#000"
    points.forEach((point) => {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI)
      ctx.fill()
    })

    // Draw current path with smooth lines
    if (currentPath.length > 1) {
      ctx.strokeStyle = "#3b82f6"
      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.beginPath()
      ctx.moveTo(currentPath[0].x, currentPath[0].y)
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y)
      }
      ctx.stroke()

      // Draw the last line in a different color
      if (currentPath.length > 1) {
        ctx.strokeStyle = "#ef4444"
        ctx.beginPath()
        ctx.moveTo(currentPath[currentPath.length - 2].x, currentPath[currentPath.length - 2].y)
        ctx.lineTo(currentPath[currentPath.length - 1].x, currentPath[currentPath.length - 1].y)
        ctx.stroke()
      }
    }

    // Draw best path with smooth lines
    if (bestPath.length > 1) {
      ctx.strokeStyle = "#10b981"
      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.beginPath()
      ctx.moveTo(bestPath[0].x, bestPath[0].y)
      for (let i = 1; i < bestPath.length; i++) {
        ctx.lineTo(bestPath[i].x, bestPath[i].y)
      }
      ctx.stroke()
    }
  }, [points, currentPath, bestPath])

  const randomizeVertices = randomizeVerticesCallback
  const drawCanvas = drawCanvasCallback

  useEffect(() => {
    randomizeVertices()
  }, [vertices, randomizeVertices])

  useEffect(() => {
    if (canvasRef.current) {
      drawCanvas()
    }
  }, [points, currentPath, bestPath, drawCanvas])

  const clearVertices = () => {
    setPoints([])
    setCurrentPath([])
    setBestPath([])
    setMetrics({
      possiblePaths: 0,
      elapsedTime: 0,
      currentDistance: 0,
      minDistance: Infinity,
    })
  }

  const nearestNeighbor = async () => {
    const startPoint = points[Math.floor(Math.random() * points.length)]
    const path: Point[] = [startPoint]
    const remainingPoints = points.filter(p => p !== startPoint)
    const startTime = performance.now()

    while (remainingPoints.length > 0 && !algorithmRef.current?.stopped) {
      const lastPoint = path[path.length - 1]
      remainingPoints.sort(
        (a, b) => distance(lastPoint, a) - distance(lastPoint, b)
      )
      const nextPoint = remainingPoints.shift()
      if (nextPoint) {
        path.push(nextPoint)
      }

      setCurrentPath([...path])
      setMetrics((prev) => ({
        ...prev,
        elapsedTime: (performance.now() - startTime) / 1000,
        currentDistance: pathCost(path),
      }))

      await new Promise((resolve) => setTimeout(resolve, 1000 - speed * 10))
    }

    if (!algorithmRef.current?.stopped) {
      path.push(startPoint) // Return to start
      const finalCost = pathCost(path)

      setBestPath(path)
      setMetrics((prev) => ({
        ...prev,
        elapsedTime: (performance.now() - startTime) / 1000,
        currentDistance: finalCost,
        minDistance: Math.min(finalCost, prev.minDistance),
      }))
    }

    setIsRunning(false)
  }

  const arbitraryInsertion = async () => {
    const startTime = performance.now()
    const startPoint = points[Math.floor(Math.random() * points.length)]
    const path: Point[] = [startPoint, points.find(p => p !== startPoint) as Point]
    const remainingPoints = points.filter(p => !path.includes(p))

    while (remainingPoints.length > 0 && !algorithmRef.current?.stopped) {
      const nextPoint = remainingPoints.shift()
      if (!nextPoint) break

      let bestPosition = 0
      let bestCost = Infinity

      for (let i = 0; i <= path.length; i++) {
        const newPath = [...path.slice(0, i), nextPoint, ...path.slice(i)]
        const cost = pathCost(newPath)
        if (cost < bestCost) {
          bestCost = cost
          bestPosition = i
        }
      }

      path.splice(bestPosition, 0, nextPoint)
      setCurrentPath([...path, path[0]])
      setMetrics((prev) => ({
        ...prev,
        elapsedTime: (performance.now() - startTime) / 1000,
        currentDistance: bestCost,
      }))

      await new Promise((resolve) => setTimeout(resolve, 1000 - speed * 10))
    }

    if (!algorithmRef.current?.stopped) {
      const finalPath = [...path, path[0]] // Return to start
      const finalCost = pathCost(finalPath)

      setBestPath(finalPath)
      setMetrics((prev) => ({
        ...prev,
        elapsedTime: (performance.now() - startTime) / 1000,
        currentDistance: finalCost,
        minDistance: Math.min(finalCost, prev.minDistance),
      }))
    }

    setIsRunning(false)
  }

  const nearestInsertion = async () => {
    const startTime = performance.now()
    const startPoint = points[Math.floor(Math.random() * points.length)]
    let path: Point[] = [startPoint, points.find(p => p !== startPoint) as Point]
    const remainingPoints = points.filter(p => !path.includes(p))

    while (remainingPoints.length > 0 && !algorithmRef.current?.stopped) {
      let nearestPoint: Point | null = null
      let nearestDistance = Infinity
      let insertPosition = 0

      for (const point of remainingPoints) {
        for (let i = 0; i < path.length; i++) {
          const d = distance(path[i], point) + distance(point, path[(i + 1) % path.length]) - distance(path[i], path[(i + 1) % path.length])
          if (d < nearestDistance) {
            nearestDistance = d
            nearestPoint = point
            insertPosition = i + 1
          }
        }
      }

      if (nearestPoint) {
        path = [...path.slice(0, insertPosition), nearestPoint, ...path.slice(insertPosition)]
        remainingPoints.splice(remainingPoints.indexOf(nearestPoint), 1)

        setCurrentPath([...path, path[0]])
        setMetrics((prev) => ({
          ...prev,
          elapsedTime: (performance.now() - startTime) / 1000,
          currentDistance: pathCost([...path, path[0]]),
        }))

        await new Promise((resolve) => setTimeout(resolve, 1000 - speed * 10))
      }
    }

    if (!algorithmRef.current?.stopped) {
      path.push(path[0]) // Return to start
      const finalCost = pathCost(path)

      setBestPath(path)
      setMetrics((prev) => ({
        ...prev,
        elapsedTime: (performance.now() - startTime) / 1000,
        currentDistance: finalCost,
        minDistance: Math.min(finalCost, prev.minDistance),
      }))
    }

    setIsRunning(false)
  }

  const furthestInsertion = async () => {
    const startTime = performance.now()
    const path: Point[] = [points[0]]
    let remainingPoints = points.slice(1)

    // INITIALIZATION - go to the furthest point first
    remainingPoints.sort((a, b) => distance(path[0], b) - distance(path[0], a))
    const furthestPoint = remainingPoints.shift()
    if (furthestPoint) {
      path.push(furthestPoint)
    }

    setCurrentPath([...path])
    setMetrics((prev) => ({
      ...prev,
      elapsedTime: (performance.now() - startTime) / 1000,
      currentDistance: pathCost(path),
    }))

    await new Promise((resolve) => setTimeout(resolve, 1000 - speed * 10))

    while (remainingPoints.length > 0 && !algorithmRef.current?.stopped) {
      // SELECTION - furthest point from the path
      let selectedDistance = 0
      let selectedPoint: Point | null = null
      for (const freePoint of remainingPoints) {
        let minDistanceToPath = Infinity
        for (const pathPoint of path) {
          const dist = distance(freePoint, pathPoint)
          if (dist < minDistanceToPath) {
            minDistanceToPath = dist
          }
        }
        if (minDistanceToPath > selectedDistance) {
          selectedDistance = minDistanceToPath
          selectedPoint = freePoint
        }
      }

      if (selectedPoint) {
        // INSERTION - find the insertion spot that minimizes distance
        let bestCost = Infinity
        let bestIdx = 0
        for (let i = 0; i < path.length; i++) {
          const insertionCost = distance(path[i], selectedPoint) + 
                                distance(selectedPoint, path[(i + 1) % path.length]) - 
                                distance(path[i], path[(i + 1) % path.length])
          if (insertionCost < bestCost) {
            bestCost = insertionCost
            bestIdx = i + 1
          }
        }

        path.splice(bestIdx, 0, selectedPoint)
        remainingPoints = remainingPoints.filter(p => p !== selectedPoint)

        setCurrentPath([...path])
        setMetrics((prev) => ({
          ...prev,
          elapsedTime: (performance.now() - startTime) / 1000,
          currentDistance: pathCost(path),
        }))

        await new Promise((resolve) => setTimeout(resolve, 1000 - speed * 10))
      }
    }

    if (!algorithmRef.current?.stopped) {
      path.push(path[0]) // Return to start
      const finalCost = pathCost(path)

      setBestPath(path)
      setMetrics((prev) => ({
        ...prev,
        elapsedTime: (performance.now() - startTime) / 1000,
        currentDistance: finalCost,
        minDistance: Math.min(finalCost, prev.minDistance),
      }))
    }

    setIsRunning(false)
  }

  // Add this function after the other algorithm implementations

  const convexHull = async () => {
    const startTime = performance.now()

    // Helper function to compute the cross product
    const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

    // Sort points lexicographically
    const sortedPoints = [...points].sort((a, b) => a.x - b.x || a.y - b.y)

    // Compute the lower hull
    const lowerHull: Point[] = []
    for (const point of sortedPoints) {
      while (lowerHull.length >= 2 && cross(lowerHull[lowerHull.length - 2], lowerHull[lowerHull.length - 1], point) <= 0) {
        lowerHull.pop()
      }
      lowerHull.push(point)
    }

    // Compute the upper hull
    const upperHull: Point[] = []
    for (let i = sortedPoints.length - 1; i >= 0; i--) {
      while (upperHull.length >= 2 && cross(upperHull[upperHull.length - 2], upperHull[upperHull.length - 1], sortedPoints[i]) <= 0) {
        upperHull.pop()
      }
      upperHull.push(sortedPoints[i])
    }

    // Combine lower and upper hulls to form the convex hull
    const hullPoints = [...lowerHull.slice(0, -1), ...upperHull.slice(0, -1)]
    let path = hullPoints
    let remainingPoints = points.filter(p => !hullPoints.includes(p))

    setCurrentPath([...path, path[0]])
    setMetrics((prev) => ({
      ...prev,
      elapsedTime: (performance.now() - startTime) / 1000,
      currentDistance: pathCost([...path, path[0]]),
    }))

    await new Promise((resolve) => setTimeout(resolve, 1000 - speed * 10))

    // Use nearest insertion for remaining points
    while (remainingPoints.length > 0 && !algorithmRef.current?.stopped) {
      let nearestPoint: Point | null = null
      let nearestDistance = Infinity
      let insertPosition = 0

      for (const point of remainingPoints) {
        for (let i = 0; i < path.length; i++) {
          const d = distance(path[i], point) + distance(point, path[(i + 1) % path.length]) - distance(path[i], path[(i + 1) % path.length])
          if (d < nearestDistance) {
            nearestDistance = d
            nearestPoint = point
            insertPosition = i + 1
          }
        }
      }

      if (nearestPoint) {
        path = [...path.slice(0, insertPosition), nearestPoint, ...path.slice(insertPosition)]
        remainingPoints = remainingPoints.filter(p => p !== nearestPoint)

        setCurrentPath([...path, path[0]])
        setMetrics((prev) => ({
          ...prev,
          elapsedTime: (performance.now() - startTime) / 1000,
          currentDistance: pathCost([...path, path[0]]),
        }))

        await new Promise((resolve) => setTimeout(resolve, 1000 - speed * 10))
      }
    }

    if (!algorithmRef.current?.stopped) {
      const finalPath = [...path, path[0]] // Return to start
      const finalCost = pathCost(finalPath)

      setBestPath(finalPath)
      setMetrics((prev) => ({
        ...prev,
        elapsedTime: (performance.now() - startTime) / 1000,
        currentDistance: finalCost,
        minDistance: Math.min(finalCost, prev.minDistance),
      }))
    }

    setIsRunning(false)
  }


  const startAlgorithm = () => {
    setIsRunning(true)
    setCurrentPath([])
    setBestPath([])
    algorithmRef.current = { stopped: false }
    switch (algorithm) {
      case "nearest-neighbor":
        nearestNeighbor()
        break
      case "arbitrary-insertion":
        arbitraryInsertion()
        break
      case "nearest-insertion":
        nearestInsertion()
        break
      case "furthest-insertion":
        furthestInsertion()
        break
      case "convex-hull":
        convexHull()
        break
      default:
        console.log("Algorithm not implemented")
        setIsRunning(false)
    }
  }

  const resetVisualization = () => {
    if (algorithmRef.current) {
      algorithmRef.current.stopped = true
    }
    setIsRunning(false)
    setCurrentPath([])
    setBestPath([])
    setMetrics((prev) => ({
      ...prev,
      elapsedTime: 0,
      currentDistance: 0,
      minDistance: Infinity,
    }))
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
  }

  // ... (rest of the component remains the same)

  // Add this return statement at the end of the component
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-4">
        <h1 className="text-3xl font-bold text-center mb-6">
          TSP Visualizer
        </h1>

        <div className="mb-6">
          <Select value={algorithm} onValueChange={setAlgorithm}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose an Algorithm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nearest-neighbor">Nearest Neighbor</SelectItem>
              <SelectItem value="arbitrary-insertion">
                Arbitrary Insertion
              </SelectItem>
              <SelectItem value="nearest-insertion">
                Nearest Insertion
              </SelectItem>
              <SelectItem value="furthest-insertion">
                Furthest Insertion
              </SelectItem>
              <SelectItem value="convex-hull">Convex Hull</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
          {/* Vertex Initialization Card */}
          <Card>
            <CardHeader>
              <CardTitle>Vertex Initialization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Vertices: {vertices}
                </label>
                <Slider
                  value={[vertices]}
                  onValueChange={(value) => setVertices(value[0])}
                  min={3}
                  max={100}
                  step={1}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={randomizeVertices}>Randomize</Button>
                <Button variant="outline" onClick={clearVertices}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Algorithm Performance Card */}
          <Card>
            <CardHeader>
              <CardTitle>Algorithm Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p>Possible Paths: {formatLargeNumber(metrics.possiblePaths)}</p>
                <p>Elapsed Time: {metrics.elapsedTime.toFixed(2)}s</p>
                <p>Current Distance: {metrics.currentDistance.toFixed(2)}</p>
                <p>Minimum Distance: {metrics.minDistance === Infinity ? "N/A" : metrics.minDistance.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Execution Controls Card */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  className="w-full"
                  onClick={startAlgorithm}
                  disabled={points.length === 0 || isRunning}
                >
                  Start!
                </Button>
                <Button
                  className="w-full"
                  onClick={resetVisualization}
                  variant="outline"
                  disabled={!isRunning && currentPath.length === 0}
                >
                  Reset
                </Button>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Speed
                  </label>
                  <Slider
                    value={[speed]}
                    onValueChange={(value) => setSpeed(value[0])}
                    min={1}
                    max={100}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Slow</span>
                    <span>Fast</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="border border-gray-200 rounded-lg aspect-[4/3] relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-full"
          />
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Created by Mahmood Gneam</p>
          <p>
            <a href="https://www.linkedin.com/in/mahmoodgneam/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              Connect on LinkedIn
            </a>
          </p>
          <p>© 2024 Mahmood Gneam. All rights reserved.</p>
        </div>
      </div>

      <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Welcome to TSP Visualizer</DialogTitle>
            <DialogDescription>
              This website visualizes various algorithms for solving the Traveling Salesman Problem (TSP). 
              Choose an algorithm, set the number of vertices, and watch the solution unfold!
            </DialogDescription>
          </DialogHeader>
          <p>Created by Mahmood Gneam</p>
          <DialogFooter>
            <Button onClick={() => setShowWelcomeDialog(false)}>Get Started</Button>
            <a
              href="https://www.linkedin.com/in/mahmoodgneam/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              <Linkedin className="w-4 h-4 mr-2" />
              Connect on LinkedIn
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
